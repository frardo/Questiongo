import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { checkRateLimit, rateLimitResponse, getClientIP, RateLimitPresets } from '@/lib/rate-limit';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Tipos de arquivo permitidos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// Tamanho máximo: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting para uploads
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit({
      ...RateLimitPresets.upload,
      identifier: clientIP,
      endpoint: 'upload',
    });
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit.resetTime);
    }

    // Verificar autenticação
    const authUser = await verifyAuth(request);
    if (!authUser) {
      return unauthorizedResponse('Token de autenticação inválido');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pasta = formData.get('pasta') as string || 'perguntas';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // Validar tipo de arquivo
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 });
    }

    // Validar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máximo 10MB)' }, { status: 400 });
    }

    // Converter File para buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload para Cloudinary
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: `questiongo/${pasta}`,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { secure_url: string });
        }
      ).end(buffer);
    });

    return NextResponse.json({ url: result.secure_url });

  } catch (error) {
    console.error('Erro no upload Cloudinary:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer upload do arquivo. Tente novamente.' },
      { status: 500 }
    );
  }
}
