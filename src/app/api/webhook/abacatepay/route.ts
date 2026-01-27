import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { createHmac } from 'crypto';

/**
 * Verifica a assinatura HMAC do webhook AbacatePay
 * @param payload - O corpo da requisição como string
 * @param signature - A assinatura recebida no header
 * @param secret - O segredo do webhook
 * @returns true se a assinatura for válida
 */
function verificarAssinaturaHMAC(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Comparação segura contra timing attacks
  if (signature.length !== expectedSignature.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Obter body como texto para verificar assinatura HMAC
    const rawBody = await request.text();
    const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;

    // Verificar assinatura HMAC (se configurada)
    if (webhookSecret) {
      const signature = request.headers.get('X-Webhook-Signature') ||
                        request.headers.get('x-webhook-signature') ||
                        request.headers.get('X-Signature') ||
                        request.headers.get('x-signature');

      // Fallback para verificação de secret simples (compatibilidade)
      const headerSecret = request.headers.get('X-Webhook-Secret') ||
                           request.headers.get('x-webhook-secret');

      if (signature) {
        // Verificação HMAC preferida
        if (!verificarAssinaturaHMAC(rawBody, signature, webhookSecret)) {
          console.error('Assinatura HMAC inválida no webhook AbacatePay');
          return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }
      } else if (headerSecret) {
        // Fallback para verificação de secret simples
        if (headerSecret !== webhookSecret) {
          console.error('Webhook secret inválido');
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      } else {
        // Nenhuma forma de autenticação presente
        console.error('Nenhuma assinatura ou secret encontrado no webhook');
        return NextResponse.json({ error: 'Missing authentication' }, { status: 401 });
      }
    }

    // Parse do JSON após validação
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      console.error('Payload JSON inválido no webhook');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Processar evento de pagamento confirmado
    if (event.event === 'billing.paid' || event.event === 'pix.paid') {
      const { metadata, amount } = event.data;

      if (metadata?.perguntaId && metadata?.respostaId) {
        const perguntaId = metadata.perguntaId;
        const respostaId = metadata.respostaId;
        const respondedorId = metadata.respondedorId;

        // Atualizar resposta como aceita
        await adminDb.collection('respostas').doc(respostaId).update({
          status: 'aceita',
          pagamentoConfirmado: true,
          pagamentoData: new Date(),
          pagamentoValor: amount / 100, // Converter de centavos
          pagamentoMetodo: 'pix',
          pagamentoGateway: 'abacatepay',
        });

        // Atualizar pergunta como respondida
        await adminDb.collection('perguntas').doc(perguntaId).update({
          status: 'respondida',
          respostaAceitaId: respostaId,
        });

        // Buscar dados da resposta para creditar o respondedor
        const respostaDoc = await adminDb.collection('respostas').doc(respostaId).get();
        const resposta = respostaDoc.data();

        // Usar respondedorId dos metadados ou do documento da resposta
        const idRespondedor = respondedorId || resposta?.usuarioId;

        if (idRespondedor) {
          // Atualizar saldo do respondedor
          const usuarioRef = adminDb.collection('saldos').doc(idRespondedor);
          const usuarioDoc = await usuarioRef.get();

          const valorCreditar = (amount / 100) * 0.85; // 85% para o respondedor (15% taxa plataforma)

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
              usuarioId: idRespondedor,
              usuarioNome: resposta?.usuarioNome || '',
              saldoDisponivel: valorCreditar,
              totalGanho: valorCreditar,
              totalSacado: 0,
              ultimaAtualizacao: new Date(),
            });
          }

          // Registrar transação
          await adminDb.collection('transacoes').add({
            usuarioId: idRespondedor,
            tipo: 'credito',
            valor: valorCreditar,
            descricao: `Resposta aceita - Pergunta #${perguntaId}`,
            perguntaId,
            respostaId,
            metodo: 'pix',
            gateway: 'abacatepay',
            criadoEm: new Date(),
          });
        }

      }
    }

    // Processar evento de saque confirmado
    if (event.event === 'withdraw.paid') {
      const { id, amount } = event.data;

      // Buscar transação de saque pelo gatewayId
      const transacoesRef = adminDb.collection('transacoes');
      const snapshot = await transacoesRef
        .where('gatewayId', '==', id)
        .where('tipo', '==', 'debito')
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const transacaoDoc = snapshot.docs[0];

        // Atualizar status da transação para concluído
        await transacaoDoc.ref.update({
          status: 'concluido',
          pagamentoConfirmado: true,
          pagamentoData: new Date(),
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
