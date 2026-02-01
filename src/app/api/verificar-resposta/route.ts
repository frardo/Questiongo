import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface VerificacaoResult {
  verificada: boolean;
  confianca: number;
  motivo: string;
}

export async function POST(request: NextRequest) {
  try {
    const { pergunta, resposta, explicacao } = await request.json();

    if (!pergunta || !resposta) {
      return NextResponse.json(
        { error: "Pergunta e resposta são obrigatórios" },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY não configurada");
      // Em caso de erro de configuração, retorna não verificada sem falhar
      return NextResponse.json({
        verificada: false,
        confianca: 0,
        motivo: "Serviço de verificação indisponível",
      });
    }

    const prompt = `
Você é um sistema de verificação de respostas educacionais. Analise se a resposta está correta para a pergunta.

PERGUNTA: ${pergunta}

RESPOSTA: ${resposta}

${explicacao ? `EXPLICAÇÃO: ${explicacao}` : ""}

Avalie a resposta considerando:
1. Correção factual - a resposta está correta?
2. Relevância - a resposta responde à pergunta?
3. Completude - a resposta aborda os pontos principais?

Responda APENAS com um JSON válido neste formato exato (sem markdown, sem texto adicional):
{"correta": true, "confianca": 85, "motivo": "A resposta está correta porque..."}

Se não tiver certeza, seja conservador e marque como incorreta.
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
          temperature: 0.2,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      console.error("Erro na API Gemini:", response.status, await response.text());
      return NextResponse.json({
        verificada: false,
        confianca: 0,
        motivo: "Erro ao verificar resposta",
      });
    }

    const data = await response.json();

    // Extrair o texto da resposta
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      console.error("Resposta vazia da API Gemini");
      return NextResponse.json({
        verificada: false,
        confianca: 0,
        motivo: "Não foi possível analisar a resposta",
      });
    }

    // Tentar parsear o JSON da resposta
    let resultado: { correta: boolean; confianca: number; motivo: string };

    try {
      // Limpar possíveis caracteres extras
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON não encontrado na resposta");
      }
      resultado = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Erro ao parsear resposta do Gemini:", parseError, textContent);
      return NextResponse.json({
        verificada: false,
        confianca: 0,
        motivo: "Erro ao processar análise",
      });
    }

    const verificacaoResult: VerificacaoResult = {
      verificada: resultado.correta === true && resultado.confianca >= 70,
      confianca: Math.min(100, Math.max(0, resultado.confianca || 0)),
      motivo: resultado.motivo || "Análise concluída",
    };

    return NextResponse.json(verificacaoResult);
  } catch (error) {
    console.error("Erro na verificação de resposta:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
