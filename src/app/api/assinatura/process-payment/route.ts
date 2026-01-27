import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentMethodId, usuarioId, usuarioEmail, usuarioNome, planoId } = body;

    if (!paymentMethodId || !usuarioId || !usuarioEmail) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Mapeamento de planos para price IDs
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

      // Cancelar subscriptions incompletas
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

    // Anexar o PaymentMethod ao Customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Definir como método de pagamento padrão
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Criar subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        usuarioId,
        usuarioNome: usuarioNome || '',
        usuarioEmail,
        planoId,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent;

    // Verificar status do pagamento
    if (paymentIntent?.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        status: 'succeeded',
      });
    } else if (paymentIntent?.status === 'requires_action') {
      // Pagamento requer autenticação 3D Secure
      return NextResponse.json({
        success: false,
        requires_action: true,
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Pagamento não foi processado',
        status: paymentIntent?.status,
      });
    }
  } catch (error: unknown) {
    console.error('Erro ao processar pagamento:', error);
    return NextResponse.json(
      { error: 'Erro ao processar pagamento. Tente novamente.' },
      { status: 500 }
    );
  }
}
