import { NextRequest, NextResponse } from 'next/server';
import { criarCobranca } from '@/lib/abacatepay';
import { criarCheckoutSession } from '@/lib/stripe';
import { verifyAuth, unauthorizedResponse, forbiddenResponse } from '@/lib/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { criarPagamentoSchema, validateBody } from '@/lib/validations';
import { checkRateLimit, rateLimitResponse, getClientIP, RateLimitPresets } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit({
      ...RateLimitPresets.payment,
      identifier: clientIP,
      endpoint: 'pagamento',
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
    const validation = validateBody(criarPagamentoSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const {
      perguntaId,
      respostaId,
      valor,
      usuarioNome,
      usuarioEmail,
      respondedorId,
      metodoPagamento,
    } = validation.data;

    // Verificar se o usuário é o dono da pergunta (prevenção de IDOR)
    const perguntaDoc = await adminDb.collection('perguntas').doc(perguntaId).get();
    if (!perguntaDoc.exists) {
      return NextResponse.json({ error: 'Pergunta não encontrada' }, { status: 404 });
    }

    const pergunta = perguntaDoc.data();
    if (pergunta?.usuarioId !== authUser.uid) {
      return forbiddenResponse('Você só pode pagar por respostas às suas próprias perguntas');
    }

    // Usar Stripe para cartão, AbacatePay para PIX
    if (metodoPagamento === 'cartao') {
      // Pagamento com cartão via Stripe
      const session = await criarCheckoutSession({
        perguntaId,
        respostaId,
        valor,
        usuarioNome: usuarioNome || '',
        usuarioEmail: usuarioEmail || '',
        respondedorId: respondedorId || '',
      });

      return NextResponse.json({
        success: true,
        url: session.url,
        sessionId: session.sessionId,
        gateway: 'stripe',
        metodo: 'cartao',
      });
    } else {
      // Pagamento com PIX via AbacatePay
      const cobranca = await criarCobranca({
        frequency: 'ONE_TIME',
        methods: ['PIX'],
        products: [
          {
            externalId: respostaId,
            name: 'Resposta de Pergunta',
            description: `Pagamento pela resposta à pergunta #${perguntaId}`,
            quantity: 1,
            price: Math.round(valor * 100), // Converter para centavos
          },
        ],
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pergunta/${perguntaId}`,
        completionUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pergunta/${perguntaId}?pagamento=sucesso`,
        metadata: {
          perguntaId,
          respostaId,
          usuarioNome: usuarioNome || '',
          usuarioEmail: usuarioEmail || '',
          respondedorId: respondedorId || '',
        },
      });

      return NextResponse.json({
        success: true,
        url: cobranca.url,
        billingId: cobranca.id,
        gateway: 'abacatepay',
        metodo: 'pix',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar cobrança. Tente novamente.' },
      { status: 500 }
    );
  }
}
