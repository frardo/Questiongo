import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { construirEventoWebhook } from '@/lib/stripe';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Obter body como texto para verificar assinatura
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 400 });
    }

    // Verificar e construir evento
    let event: Stripe.Event;
    try {
      event = construirEventoWebhook(body, signature);
    } catch (err) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }

    // Processar evento de pagamento confirmado
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      // Verificar se é assinatura Premium
      if (session.mode === 'subscription' && session.metadata?.tipo === 'premium') {
        const { usuarioId, usuarioNome, usuarioEmail } = session.metadata;

        if (usuarioId) {
          // Salvar assinatura do usuário
          await adminDb.collection('assinaturas').doc(usuarioId).set({
            usuarioId,
            usuarioNome: usuarioNome || '',
            usuarioEmail: usuarioEmail || '',
            status: 'ativa',
            plano: 'premium',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          });

          // Atualizar usuário como premium
          await adminDb.collection('usuarios').doc(usuarioId).update({
            isPremium: true,
            premiumDesde: new Date(),
          });
        }
      }

      // Pagamento de resposta (fluxo existente)
      if (session.payment_status === 'paid' && session.metadata && session.mode === 'payment') {
        const { perguntaId, respostaId, respondedorId } = session.metadata;
        const amount = session.amount_total || 0;

        if (perguntaId && respostaId) {
          // Atualizar resposta como aceita
          await adminDb.collection('respostas').doc(respostaId).update({
            status: 'aceita',
            pagamentoConfirmado: true,
            pagamentoData: new Date(),
            pagamentoValor: amount / 100, // Converter de centavos
            pagamentoMetodo: 'cartao',
            pagamentoGateway: 'stripe',
            stripeSessionId: session.id,
          });

          // Atualizar pergunta como respondida
          await adminDb.collection('perguntas').doc(perguntaId).update({
            status: 'respondida',
            respostaAceitaId: respostaId,
          });

          // Creditar o respondedor
          if (respondedorId) {
            const usuarioRef = adminDb.collection('saldos').doc(respondedorId);
            const usuarioDoc = await usuarioRef.get();

            // Verificar se respondedor é premium para aplicar taxa correta
            const assinaturaDoc = await adminDb.collection('assinaturas').doc(respondedorId).get();
            const isPremium = assinaturaDoc.exists && assinaturaDoc.data()?.status === 'ativa';
            const taxaPlataforma = isPremium ? 0.05 : 0.15; // 5% para premium, 15% para normal
            const valorCreditar = (amount / 100) * (1 - taxaPlataforma);

            if (usuarioDoc.exists) {
              const saldoAtual = usuarioDoc.data()?.saldoDisponivel || 0;
              const totalGanho = usuarioDoc.data()?.totalGanho || 0;

              await usuarioRef.update({
                saldoDisponivel: saldoAtual + valorCreditar,
                totalGanho: totalGanho + valorCreditar,
                ultimaAtualizacao: new Date(),
              });
            } else {
              // Buscar nome do usuário da resposta
              const respostaDoc = await adminDb.collection('respostas').doc(respostaId).get();
              const resposta = respostaDoc.data();

              await usuarioRef.set({
                usuarioId: respondedorId,
                usuarioNome: resposta?.usuarioNome || '',
                saldoDisponivel: valorCreditar,
                totalGanho: valorCreditar,
                totalSacado: 0,
                ultimaAtualizacao: new Date(),
              });
            }

            // Registrar transação
            await adminDb.collection('transacoes').add({
              usuarioId: respondedorId,
              tipo: 'credito',
              valor: valorCreditar,
              descricao: `Resposta aceita - Pergunta #${perguntaId}`,
              perguntaId,
              respostaId,
              metodo: 'cartao',
              gateway: 'stripe',
              criadoEm: new Date(),
            });
          }
        }
      }
    }

    // Processar cancelamento de assinatura
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const usuarioId = subscription.metadata?.usuarioId;

      if (usuarioId) {
        // Atualizar status da assinatura
        await adminDb.collection('assinaturas').doc(usuarioId).update({
          status: 'cancelada',
          canceladoEm: new Date(),
          atualizadoEm: new Date(),
        });

        // Remover premium do usuário
        await adminDb.collection('usuarios').doc(usuarioId).update({
          isPremium: false,
          premiumAte: new Date(),
        });
      }
    }

    // Processar falha no pagamento da assinatura
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as any;
      const subscriptionId = invoice.subscription as string;

      if (subscriptionId) {
        // Buscar assinatura pelo stripeSubscriptionId
        const assinaturasSnapshot = await adminDb
          .collection('assinaturas')
          .where('stripeSubscriptionId', '==', subscriptionId)
          .limit(1)
          .get();

        if (!assinaturasSnapshot.empty) {
          const assinaturaDoc = assinaturasSnapshot.docs[0];
          await assinaturaDoc.ref.update({
            status: 'pagamento_falhou',
            atualizadoEm: new Date(),
          });
        }
      }
    }

    // Processar reembolso
    if (event.type === 'charge.refunded') {
      // Implementar lógica de reembolso se necessário
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}
