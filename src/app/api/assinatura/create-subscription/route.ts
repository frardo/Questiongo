import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuarioId, usuarioEmail, usuarioNome, planoId } = body;

    if (!usuarioId || !usuarioEmail) {
      return NextResponse.json(
        { error: 'Dados do usuário são obrigatórios' },
        { status: 400 }
      );
    }

    // Mapeamento de planos para price IDs da Stripe
    const priceIds: Record<string, string | undefined> = {
      mensal: process.env.STRIPE_PRICE_ID_MENSAL,
      semestral: process.env.STRIPE_PRICE_ID_SEMESTRAL,
      anual: process.env.STRIPE_PRICE_ID_ANUAL,
    };

    const priceId = priceIds[planoId] || priceIds.anual;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Plano inválido' },
        { status: 400 }
      );
    }


    // Buscar ou criar customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: usuarioEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];

      // Cancelar subscriptions incompletas existentes
      const incompleteSubscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'incomplete',
      });

      for (const sub of incompleteSubscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    } else {
      customer = await stripe.customers.create({
        email: usuarioEmail,
        name: usuarioNome || undefined,
        metadata: { usuarioId },
      });
    }

    // Criar subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        usuarioId,
        usuarioNome: usuarioNome || '',
        usuarioEmail,
        planoId,
      },
    });

    const invoice = subscription.latest_invoice as any;
    let paymentIntent = invoice?.payment_intent;

    // Se payment_intent for string, buscar o objeto completo
    if (typeof paymentIntent === 'string') {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntent);
    }

    // Se não tiver client_secret, pode ser que precise criar manualmente
    if (!paymentIntent?.client_secret) {
      // Tentar finalizar o invoice para gerar o payment intent
      if (invoice?.status === 'draft') {
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id) as any;
        if (finalizedInvoice?.payment_intent && typeof finalizedInvoice.payment_intent === 'string') {
          paymentIntent = await stripe.paymentIntents.retrieve(finalizedInvoice.payment_intent);
        }
      }
    }

    if (!paymentIntent?.client_secret) {
      // Última tentativa: criar um SetupIntent ao invés
      const setupIntent = await stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        metadata: {
          subscriptionId: subscription.id,
          usuarioId,
          planoId,
        },
      });

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        clientSecret: setupIntent.client_secret,
        customerId: customer.id,
        type: 'setup', // Indicar que é SetupIntent
      });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: customer.id,
      type: 'payment',
    });
  } catch (error: unknown) {
    console.error('Erro ao criar subscription:', error);
    return NextResponse.json(
      { error: 'Erro ao criar assinatura. Tente novamente.' },
      { status: 500 }
    );
  }
}
