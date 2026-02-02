import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { enviarEmailPagamentoRecebido, enviarEmailPagamentoConfirmado } from '@/lib/email';
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { verificarPagamentoSchema, validateBody } from '@/lib/validations';
import { checkRateLimit, rateLimitResponse, getClientIP, RateLimitPresets } from '@/lib/rate-limit';

// Verificar status do pagamento na AbacatePay
async function verificarPagamentoAbacatePay(billingId: string) {
  const apiKey = process.env.ABACATEPAY_API_KEY;

  const response = await fetch(`https://api.abacatepay.com/v1/billing/list`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const data = await response.json();

  if (data.data) {
    const billing = data.data.find((b: { id: string }) => b.id === billingId);
    return billing;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit({
      ...RateLimitPresets.payment,
      identifier: clientIP,
      endpoint: 'pagamento-verificar',
    });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime);
    }

    // Verificar autenticação
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return unauthorizedResponse('Token de autenticação inválido');
    }

    const body = await request.json();

    // Validar dados de entrada com Zod
    const validation = validateBody(verificarPagamentoSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { perguntaId, respostaId, billingId } = validation.data;

    // Buscar a resposta para verificar se já foi processada
    const respostaDoc = await adminDb.collection('respostas').doc(respostaId).get();
    const resposta = respostaDoc.data();

    if (resposta?.status === 'aceita') {
      return NextResponse.json({
        success: true,
        status: 'aceita',
        message: 'Pagamento já foi processado'
      });
    }

    // Buscar o valor correto da pergunta no Firebase
    const perguntaDoc = await adminDb.collection('perguntas').doc(perguntaId).get();
    const pergunta = perguntaDoc.data();

    if (!pergunta) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    // Verificar se o usuário é o dono da pergunta
    if (pergunta.usuarioId !== authUser.uid) {
      return forbiddenResponse('Você só pode verificar pagamentos de suas perguntas');
    }

    // Valor da pergunta em centavos (converter se necessário)
    const valorPergunta = pergunta.valor || 0;
    const valorEmCentavos = valorPergunta < 100 ? valorPergunta * 100 : valorPergunta;

    // Se temos billingId, verificar na AbacatePay
    if (billingId) {
      const billing = await verificarPagamentoAbacatePay(billingId);

      if (billing?.status === 'PAID') {
        // Pagamento confirmado! Usar valor da pergunta, não do billing
        await processarPagamento(perguntaId, respostaId, valorEmCentavos);

        return NextResponse.json({
          success: true,
          status: 'aceita',
          message: 'Pagamento confirmado e processado!'
        });
      }

      return NextResponse.json({
        success: false,
        status: billing?.status || 'PENDING',
        message: 'Pagamento ainda não confirmado'
      });
    }

    // Sem billingId, verificar se existe alguma cobrança paga recente
    const apiKey = process.env.ABACATEPAY_API_KEY;
    const response = await fetch(`https://api.abacatepay.com/v1/billing/list`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      // Procurar cobrança PAGA com metadata correspondente
      const billing = data.data.find((b: {
        status: string;
        metadata?: { perguntaId?: string; respostaId?: string }
      }) => {
        const statusPago = b.status === 'PAID' || b.status === 'paid' || b.status === 'COMPLETED';
        const metadataMatch = b.metadata?.perguntaId === perguntaId && b.metadata?.respostaId === respostaId;
        return metadataMatch && statusPago;
      });

      if (billing) {
        // Usar valor da pergunta, não do billing
        await processarPagamento(perguntaId, respostaId, valorEmCentavos);

        return NextResponse.json({
          success: true,
          status: 'aceita',
          message: 'Pagamento encontrado e processado!'
        });
      }

      // REMOVIDO: Fallback perigoso que buscava qualquer cobrança recente
      // Isso poderia creditar a conta errada em caso de race conditions
      // Agora exigimos billingId ou metadata correspondente para processar pagamento
    }

    return NextResponse.json({
      success: false,
      status: 'pendente',
      message: 'Nenhum pagamento confirmado encontrado. Verifique se o PIX foi pago.'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao verificar pagamento. Tente novamente.' },
      { status: 500 }
    );
  }
}

async function processarPagamento(perguntaId: string, respostaId: string, amountCents: number) {
  const adminDb = getAdminDb();

  // Atualizar resposta como aceita
  await adminDb.collection('respostas').doc(respostaId).update({
    status: 'aceita',
    pagamentoConfirmado: true,
    pagamentoData: new Date(),
    pagamentoValor: amountCents / 100,
  });

  // Atualizar pergunta como respondida/fechada
  await adminDb.collection('perguntas').doc(perguntaId).update({
    status: 'respondida',
    respostaAceitaId: respostaId,
  });

  // Buscar dados da resposta para creditar o respondedor
  const respostaDoc = await adminDb.collection('respostas').doc(respostaId).get();
  const resposta = respostaDoc.data();

  if (resposta?.usuarioId) {
    const usuarioRef = adminDb.collection('saldos').doc(resposta.usuarioId);
    const usuarioDoc = await usuarioRef.get();

    const valorCreditar = (amountCents / 100) * 0.85; // 85% para o respondedor

    if (usuarioDoc.exists) {
      const saldoAtual = usuarioDoc.data()?.saldoDisponivel || 0;
      const totalGanho = usuarioDoc.data()?.totalGanho || 0;

      await usuarioRef.update({
        saldoDisponivel: saldoAtual + valorCreditar,
        totalGanho: totalGanho + valorCreditar,
        ultimaAtualizacao: new Date(),
      });
    } else {
      await usuarioRef.set({
        usuarioId: resposta.usuarioId,
        usuarioNome: resposta.usuarioNome || '',
        saldoDisponivel: valorCreditar,
        totalGanho: valorCreditar,
        totalSacado: 0,
        ultimaAtualizacao: new Date(),
      });
    }

    // Registrar transação
    await adminDb.collection('transacoes').add({
      usuarioId: resposta.usuarioId,
      tipo: 'credito',
      valor: valorCreditar,
      descricao: `Resposta aceita - Pergunta #${perguntaId}`,
      perguntaId,
      respostaId,
      criadoEm: new Date(),
    });

    // Enviar email para o respondedor
    try {
      const perguntaDoc = await adminDb.collection('perguntas').doc(perguntaId).get();
      const pergunta = perguntaDoc.data();
      const perguntaTexto = pergunta?.pergunta || 'Pergunta';

      // Email para quem respondeu (recebeu o pagamento)
      if (resposta.usuarioEmail) {
        await enviarEmailPagamentoRecebido(
          resposta.usuarioEmail,
          resposta.usuarioNome || 'Usuário',
          valorCreditar,
          perguntaTexto  // Só a pergunta, NUNCA a resposta
        );
      }

      // Email para quem fez a pergunta (confirmação do pagamento)
      if (pergunta?.usuarioEmail) {
        await enviarEmailPagamentoConfirmado(
          pergunta.usuarioEmail,
          pergunta.usuarioNome || 'Usuário',
          amountCents / 100,
          perguntaTexto
        );
      }
    } catch (emailError) {
      // Não falhar o pagamento se o email der erro
    }
  }
}
