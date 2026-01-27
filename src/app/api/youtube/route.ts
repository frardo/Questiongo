import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ error: 'Query é obrigatória' }, { status: 400 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'YouTube API Key não configurada' }, { status: 500 });
    }

    // Buscar vídeos do YouTube - filtrado para conteúdo educacional
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query + ' aula explicação')}&` +
      `type=video&` +
      `maxResults=4&` +
      `order=relevance&` +
      `relevanceLanguage=pt&` +
      `videoCategoryId=27&` + // Categoria 27 = Educação
      `safeSearch=strict&` +
      `key=${apiKey}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Erro YouTube API:', error);
      return NextResponse.json({ error: 'Erro ao buscar vídeos' }, { status: 500 });
    }

    const data = await response.json();

    // Formatar resposta
    const videos = data.items?.map((item: {
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails: { medium: { url: string } };
        channelTitle: string;
        publishedAt: string;
      };
    }) => ({
      id: item.id.videoId,
      titulo: item.snippet.title,
      descricao: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      canal: item.snippet.channelTitle,
      publicadoEm: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    })) || [];

    return NextResponse.json({ videos });

  } catch (error) {
    console.error('Erro ao buscar vídeos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar vídeos' },
      { status: 500 }
    );
  }
}
