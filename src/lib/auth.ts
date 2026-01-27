import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';

export interface AuthUser {
  uid: string;
  email?: string;
  name?: string;
}

/**
 * Verifica o token Firebase ID e retorna os dados do usuário
 * @param request NextRequest com header Authorization: Bearer <token>
 * @returns AuthUser ou null se não autenticado
 */
export async function verifyAuth(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove "Bearer "

    if (!token) {
      return null;
    }

    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
    };
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}

/**
 * Helper para retornar resposta 401 Unauthorized
 */
export function unauthorizedResponse(message = 'Não autorizado') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  );
}

/**
 * Helper para retornar resposta 403 Forbidden
 */
export function forbiddenResponse(message = 'Acesso negado') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  );
}

/**
 * Verifica se o usuário autenticado é o dono do recurso
 */
export function isResourceOwner(authUser: AuthUser, resourceUserId: string): boolean {
  return authUser.uid === resourceUserId;
}
