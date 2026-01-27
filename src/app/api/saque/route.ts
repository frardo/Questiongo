import { NextRequest, NextResponse } from 'next/server';
import { criarSaque } from '@/lib/abacatepay';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { verifyAuth, unauthorizedResponse, forbiddenResponse, isResourceOwner } from '@/lib/auth';
import { saqueSchema, validateBody } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return unauthorizedResponse('Token de autenticação inválido');
    }

    const body = await request.json();

    // Validar dados de entrada com Zod
    const validation = validateBody(saqueSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      usuarioId,
      valor,
      chavePix,
      tipoChave,
      descricao,
      gateway,
    } = validation.data;

    // Verificar se o usuário está sacando de sua própria conta
    if (!isResourceOwner(authUser, usuarioId)) {
      return forbiddenResponse('Você só pode sacar de sua própria conta');
    }

    // Buscar saldo do usuário no Firebase
    const saldoRef = doc(db, 'saldos', usuarioId);
    const saldoDoc = await getDoc(saldoRef);

    if (!saldoDoc.exists()) {
      return NextResponse.json({ error: 'Saldo não encontrado' }, { status: 404 });
    }

    const saldoAtual = saldoDoc.data();

    if (saldoAtual.saldoDisponivel < valor) {
      return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });
    }

    // Processar saque via AbacatePay
    if (gateway === 'abacatepay') {
      try {
        // Taxa da plataforma QuestionGo: 9.98%
        const TAXA_PLATAFORMA = 0.0998;
        const valorTaxa = valor * TAXA_PLATAFORMA;
        const valorLiquido = valor - valorTaxa;

        // Converter para centavos (valor que o usuário recebe)
        const valorCentavos = Math.round(valorLiquido * 100);

        // Criar saque na AbacatePay
        const saque = await criarSaque({
          amount: valorCentavos,
          pixKey: chavePix,
          notes: descricao || `Saque QuestionGo - ${tipoChave}: ${chavePix}`
        });

        // Atualizar saldo do usuário (deduzir valor total)
        await updateDoc(saldoRef, {
          saldoDisponivel: saldoAtual.saldoDisponivel - valor,
          totalSacado: (saldoAtual.totalSacado || 0) + valor,
          ultimaAtualizacao: Timestamp.now()
        });

        // Registrar transação do saque
        await addDoc(collection(db, 'transacoes'), {
          usuarioId,
          tipo: 'debito',
          valor: valor, // Valor total debitado do saldo
          valorLiquido: valorLiquido, // Valor que o usuário recebe
          valorTaxa: valorTaxa, // Taxa da plataforma
          taxaPercentual: TAXA_PLATAFORMA * 100, // 9.98%
          descricao: `Saque via PIX - ${chavePix}`,
          status: 'pendente',
          gateway: 'abacatepay',
          gatewayId: saque.id,
          chavePix,
          tipoChave,
          criadoEm: Timestamp.now()
        });

        return NextResponse.json({
          success: true,
          message: 'Saque solicitado com sucesso',
          data: {
            id: saque.id,
            status: saque.status,
            valorSolicitado: valor,
            taxa: valorTaxa,
            taxaPercentual: '9.98%',
            valorLiquido: valorLiquido,
            chavePix
          }
        });

      } catch (abacateError: unknown) {
        console.error('Erro AbacatePay:', abacateError);
        return NextResponse.json({
          error: 'Erro ao processar saque. Tente novamente mais tarde.'
        }, { status: 500 });
      }
    }

    // Gateway Stripe (TODO: implementar)
    if (gateway === 'stripe') {
      return NextResponse.json({
        error: 'Saques via Stripe ainda não implementados'
      }, { status: 501 });
    }

    return NextResponse.json({ error: 'Gateway inválido' }, { status: 400 });

  } catch (error: unknown) {
    console.error('Erro no saque:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor. Tente novamente.'
    }, { status: 500 });
  }
}

// Verificar status do saque
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const saqueId = searchParams.get('id');

    if (!saqueId) {
      return NextResponse.json({ error: 'ID do saque é obrigatório' }, { status: 400 });
    }

    const { buscarSaque } = await import('@/lib/abacatepay');
    const saque = await buscarSaque(saqueId);

    return NextResponse.json({
      success: true,
      data: saque
    });

  } catch (error: unknown) {
    console.error('Erro ao buscar saque:', error);
    return NextResponse.json({
      error: 'Erro ao buscar informações do saque.'
    }, { status: 500 });
  }
}
