import { NextRequest, NextResponse } from 'next/server';
import { verificarSessao } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID não fornecido' },
        { status: 400 }
      );
    }

    const session = await verificarSessao(sessionId);

    return NextResponse.json({
      success: true,
      status: session.payment_status,
      paid: session.payment_status === 'paid',
      metadata: session.metadata,
    });
  } catch (error) {
    console.error('Erro ao verificar sessão Stripe:', error);
    return NextResponse.json(
      { error: 'Erro ao verificar pagamento. Tente novamente.' },
      { status: 500 }
    );
  }
}
