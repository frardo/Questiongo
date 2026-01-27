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
    const priceIds: Record<string, string> = {
      mensal: process.env.STRIPE_PRICE_ID_MENSAL!,
      semestral: process.env.STRIPE_PRICE_ID_SEMESTRAL!,
      anual: process.env.STRIPE_PRICE_ID_ANUAL!,
    };

    const priceId = priceIds[planoId] || priceIds.anual;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Criar sessão de checkout para assinatura
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: usuarioEmail,
      success_url: `${baseUrl}/home?assinatura=sucesso`,
      cancel_url: `${baseUrl}/home?assinatura=cancelado`,
      metadata: {
        usuarioId,
        usuarioNome: usuarioNome || '',
        usuarioEmail,
        tipo: 'premium',
      },
      subscription_data: {
        metadata: {
          usuarioId,
          usuarioNome: usuarioNome || '',
          usuarioEmail,
        },
      },
    });

    if (!session.url) {
      throw new Error('Falha ao criar sessão de checkout');
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Erro ao criar checkout de assinatura:', error);
    return NextResponse.json(
      { error: 'Erro ao criar checkout' },
      { status: 500 }
    );
  }
}
