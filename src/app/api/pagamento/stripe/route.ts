import { NextRequest, NextResponse } from 'next/server';
import { criarCheckoutSession } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { perguntaId, respostaId, valor, usuarioNome, usuarioEmail, respondedorId } = body;

    if (!perguntaId || !respostaId || !valor || !respondedorId) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
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
