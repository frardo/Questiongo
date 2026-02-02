import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rotas que requerem autenticação
const PROTECTED_API_ROUTES = [
  '/api/saldo/resetar',
  '/api/saque',
  '/api/pagamento/verificar',
  '/api/upload',
  '/api/pagamento',
  '/api/assinatura/create-subscription',
  '/api/assinatura/checkout',
  '/api/assinatura/process-payment',
  '/api/verificar-resposta',
  '/api/analisar-spam',
];

// Rotas públicas (webhooks, etc.)
const PUBLIC_API_ROUTES = [
  '/api/webhook/abacatepay',
  '/api/webhook/stripe',
  '/api/youtube',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é uma rota de API protegida
  const isProtectedRoute = PROTECTED_API_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  const isPublicRoute = PUBLIC_API_ROUTES.some(route =>
    pathname.startsWith(route)
  );

  // Se for uma rota protegida
  if (isProtectedRoute && !isPublicRoute) {
    const authHeader = request.headers.get('Authorization');

    // Verificar se tem header de autorização
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autorização não fornecido' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    if (!token || token === 'undefined' || token === 'null') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Token presente - a verificação completa será feita na rota
    // O middleware apenas garante que o header existe
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
