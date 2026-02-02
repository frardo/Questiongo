import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyAuth, unauthorizedResponse, forbiddenResponse, isResourceOwner } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const adminDb = getAdminDb();

    // Verificar autenticação
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return unauthorizedResponse('Token de autenticação inválido');
    }

    const body = await request.json();
    const { usuarioId } = body;

    if (!usuarioId) {
      return NextResponse.json({ error: 'usuarioId é obrigatório' }, { status: 400 });
    }

    // Verificar se o usuário só está resetando seu próprio saldo
    if (!isResourceOwner(authUser, usuarioId)) {
      return forbiddenResponse('Você só pode resetar seu próprio saldo');
    }

    // Resetar saldo
    const saldoRef = adminDb.collection('saldos').doc(usuarioId);
    await saldoRef.set({
      usuarioId,
      saldoDisponivel: 0,
      totalGanho: 0,
      totalSacado: 0,
      ultimaAtualizacao: new Date(),
    });

    // Deletar transações do usuário
    const transacoesSnapshot = await adminDb
      .collection('transacoes')
      .where('usuarioId', '==', usuarioId)
      .get();

    const batch = adminDb.batch();
    transacoesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    return NextResponse.json({
      success: true,
      message: 'Saldo e transações resetados com sucesso!'
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao resetar saldo' },
      { status: 500 }
    );
  }
}
