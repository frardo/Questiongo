import { NextRequest, NextResponse } from 'next/server';
import { criarCheckoutSession } from '@/lib/stripe';
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { pagamentoStripeSchema, validateBody } from '@/lib/validations';
import { checkRateLimit, rateLimitResponse, getClientIP, RateLimitPresets } from '@/lib/rate-limit';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit({
      ...RateLimitPresets.payment,
      identifier: clientIP,
      endpoint: 'pagamento-stripe',
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
    const validation = validateBody(pagamentoStripeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { perguntaId, respostaId, valor, usuarioNome, usuarioEmail, respondedorId } = validation.data;

    // Verificar se o usuário é o dono da pergunta (prevenção de IDOR)
    const perguntaDoc = await adminDb.collection('perguntas').doc(perguntaId).get();
    if (!perguntaDoc.exists) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    const pergunta = perguntaDoc.data();
    if (pergunta?.usuarioId !== authUser.uid) {
      return forbiddenResponse('Você só pode pagar por respostas às suas próprias perguntas');
    }

    // Criar sessão de checkout no Stripe
    const session = await criarCheckoutSession({
      perguntaId,
      respostaId,
      valor,
      usuarioNome: usuarioNome || '',
      usuarioEmail: usuarioEmail || '',
      respondedorId,
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.sessionId,
    });
  } catch (error) {
    console.error('Erro ao criar sessão Stripe:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de pagamento. Tente novamente.' },
      { status: 500 }
    );
  }
}
