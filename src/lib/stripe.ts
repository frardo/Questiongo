// Stripe API Integration
// Documentação: https://stripe.com/docs/api

import Stripe from 'stripe';

// Inicializa o cliente Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

export { stripe };

// Tipos para pagamento
export interface StripePaymentData {
  perguntaId: string;
  respostaId: string;
  valor: number; // Em reais
  usuarioNome: string;
  usuarioEmail: string;
  respondedorId: string;
}

export interface StripeSessionResult {
  sessionId: string;
  url: string;
}

// Criar sessão de checkout para pagamento com cartão
export async function criarCheckoutSession(dados: StripePaymentData): Promise<StripeSessionResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'brl',
          product_data: {
            name: 'Resposta de Pergunta',
            description: `Pagamento pela resposta à pergunta #${dados.perguntaId}`,
          },
          unit_amount: Math.round(dados.valor * 100), // Converter para centavos
        },
        quantity: 1,
      },
    ],
    customer_email: dados.usuarioEmail,
    success_url: `${baseUrl}/pergunta/${dados.perguntaId}?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/pergunta/${dados.perguntaId}?pagamento=cancelado`,
    metadata: {
      perguntaId: dados.perguntaId,
      respostaId: dados.respostaId,
      usuarioNome: dados.usuarioNome,
      usuarioEmail: dados.usuarioEmail,
      respondedorId: dados.respondedorId,
    },
  });

  if (!session.url) {
    throw new Error('Falha ao criar sessão de checkout');
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

// Verificar status de uma sessão de checkout
export async function verificarSessao(sessionId: string): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  return session;
}

// Construir evento de webhook com verificação de assinatura
export function construirEventoWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Criar reembolso
export async function criarReembolso(paymentIntentId: string, motivo?: string): Promise<Stripe.Refund> {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      motivo: motivo || 'Reembolso solicitado pelo usuário',
    },
  });

  return refund;
}

// Obter Payment Intent de uma sessão
export async function obterPaymentIntent(sessionId: string): Promise<Stripe.PaymentIntent | null> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

  if (typeof session.payment_intent === 'string') {
    return await stripe.paymentIntents.retrieve(session.payment_intent);
  }

  return session.payment_intent;
}
