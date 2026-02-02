import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { checkoutAssinaturaSchema, validateBody } from '@/lib/validations';
import { checkRateLimit, rateLimitResponse, getClientIP, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit({
      ...RateLimitPresets.payment,
      identifier: clientIP,
      endpoint: 'assinatura-checkout',
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
    const validation = validateBody(checkoutAssinaturaSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { usuarioId, usuarioEmail, usuarioNome, planoId } = validation.data;

    // Verificar se o usuário está criando assinatura para si mesmo
    if (authUser.uid !== usuarioId) {
      return forbiddenResponse('Você só pode criar assinaturas para sua própria conta');
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
    return NextResponse.json(
      { error: 'Erro ao criar checkout' },
      { status: 500 }
    );
  }
}
