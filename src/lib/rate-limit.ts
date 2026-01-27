import { NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Cache em memória para rate limiting (reset no deploy)
// Para produção com múltiplas instâncias, use Redis/Upstash
const rateLimitCache = new Map<string, RateLimitRecord>();

// Limpar registros expirados periodicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitCache.entries()) {
    if (now > record.resetTime) {
      rateLimitCache.delete(key);
    }
  }
}, 60000); // Limpar a cada 1 minuto

interface RateLimitOptions {
  /** Número máximo de requisições permitidas */
  limit: number;
  /** Janela de tempo em milissegundos */
  windowMs: number;
  /** Identificador único (ex: IP, userId) */
  identifier: string;
  /** Nome do endpoint para logs */
  endpoint?: string;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
}

/**
 * Verifica rate limit para um identificador
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs, identifier, endpoint } = options;
  const key = `${endpoint || 'default'}:${identifier}`;
  const now = Date.now();

  const record = rateLimitCache.get(key);

  if (!record || now > record.resetTime) {
    // Criar novo registro
    rateLimitCache.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  if (record.count >= limit) {
    // Rate limit excedido
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Incrementar contador
  record.count += 1;
  rateLimitCache.set(key, record);

  return {
    success: true,
    remaining: limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Retorna resposta 429 com headers apropriados
 */
export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: 'Muitas requisições. Aguarde antes de tentar novamente.',
      retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
      },
    }
  );
}

/**
 * Extrai IP do request para usar como identificador
 */
export function getClientIP(request: Request): string {
  // Headers comuns para proxies (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback para desenvolvimento
  return 'unknown';
}

// Presets comuns de rate limiting
export const RateLimitPresets = {
  /** APIs públicas: 60 req/min */
  public: { limit: 60, windowMs: 60000 },
  /** APIs de escrita: 30 req/min */
  write: { limit: 30, windowMs: 60000 },
  /** APIs de pagamento: 10 req/min */
  payment: { limit: 10, windowMs: 60000 },
  /** APIs de autenticação: 5 req/min */
  auth: { limit: 5, windowMs: 60000 },
  /** Uploads: 10 req/5min */
  upload: { limit: 10, windowMs: 300000 },
} as const;
