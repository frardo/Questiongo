import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface SpamAnalysisResult {
  spam: boolean;
  motivo: string;
}

export async function POST(request: NextRequest) {
  try {
    const { pergunta, resposta } = await request.json();

    if (!pergunta || !resposta) {
      return NextResponse.json(
        { error: "Pergunta e resposta são obrigatórios" },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      // Em caso de erro de configuração, não marca como spam (conservador)
      return NextResponse.json({
        spam: false,
        motivo: "Serviço de análise indisponível",
      });
    }

    const prompt = `
Você é um sistema de moderação de conteúdo educacional. Esta resposta foi denunciada 3 vezes por outros usuários.
Analise se a resposta é spam, troll, conteúdo ofensivo ou inadequado.

PERGUNTA ORIGINAL: ${pergunta}

RESPOSTA DENUNCIADA: ${resposta}

Considere SPAM/TROLL se:
1. A resposta não tem relação com a pergunta
2. Contém conteúdo ofensivo, palavrões ou linguagem inadequada
3. É uma provocação ou piada que não ajuda
4. É texto sem sentido, caracteres aleatórios ou repetições
5. É propaganda ou links suspeitos
6. Tenta enganar ou prejudicar o estudante

Considere NÃO SPAM se:
1. A resposta tenta ajudar, mesmo que esteja incorreta
2. A resposta é relevante para o tema
3. O texto é coerente e educado

Responda APENAS com um JSON válido neste formato exato (sem markdown, sem texto adicional):
{"spam": true, "motivo": "Motivo da classificação"}

Seja conservador: só marque como spam se tiver certeza.
`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Baixa temperatura para ser mais determinístico
          maxOutputTokens: 300,
        },
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        spam: false,
        motivo: "Erro ao analisar resposta",
      });
    }

    const data = await response.json();

    // Extrair o texto da resposta
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return NextResponse.json({
        spam: false,
        motivo: "Não foi possível analisar a resposta",
      });
    }

    // Tentar parsear o JSON da resposta
    let resultado: { spam: boolean; motivo: string };

    try {
      // Limpar possíveis caracteres extras
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON não encontrado na resposta");
      }
      resultado = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return NextResponse.json({
        spam: false,
        motivo: "Erro ao processar análise",
      });
    }

    const spamResult: SpamAnalysisResult = {
      spam: resultado.spam === true,
      motivo: resultado.motivo || "Análise concluída",
    };

    return NextResponse.json(spamResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
