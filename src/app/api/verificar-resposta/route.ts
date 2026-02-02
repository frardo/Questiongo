import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface VerificacaoResult {
  verificada: boolean;
  confianca: number;
  motivo: string;
}

function buildPrompt(pergunta: string, resposta: string, explicacao?: string): string {
  return `
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
}

async function chamarGroq(prompt: string): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function chamarGemini(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 500 },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(request: NextRequest) {
  try {
    const t0 = Date.now();

    const { pergunta, resposta, explicacao, respostaId } = await request.json();

    if (!pergunta || !resposta) {
      return NextResponse.json(
        { error: "Pergunta e resposta são obrigatórios" },
        { status: 400 }
      );
    }


    const prompt = buildPrompt(pergunta, resposta, explicacao);

    // Tentar Groq primeiro, fallback para Gemini
    let textContent = "";
    let provedor = "";

    if (GROQ_API_KEY) {
      try {
        textContent = await chamarGroq(prompt);
        provedor = "Groq";
      } catch (groqError) {
      }
    }

    if (!textContent && GEMINI_API_KEY) {
      try {
        textContent = await chamarGemini(prompt);
        provedor = "Gemini";
      } catch (geminiError) {
      }
    }

    if (!textContent) {
      return NextResponse.json({
        verificada: undefined,
        confianca: 0,
        motivo: "Serviço de verificação indisponível",
      });
    }

    // Tentar parsear o JSON da resposta
    let resultado: { correta: boolean; confianca: number; motivo: string };

    try {
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("JSON não encontrado na resposta");
      }
      resultado = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      return NextResponse.json({
        verificada: undefined,
        confianca: 0,
        motivo: "Erro ao processar análise",
      });
    }

    const verificacaoResult: VerificacaoResult = {
      verificada: resultado.correta === true && resultado.confianca >= 70,
      confianca: Math.min(100, Math.max(0, resultado.confianca || 0)),
      motivo: resultado.motivo || "Análise concluída",
    };


    // Salvar verificação diretamente no Firestore
    if (respostaId) {
      try {
        const db = getAdminDb();
        await db.collection('respostas').doc(respostaId).update({
          verificada: verificacaoResult.verificada,
          verificadaEm: FieldValue.serverTimestamp(),
          confiancaIA: verificacaoResult.confianca,
        });
      } catch (dbError) {
      }
    } else {
    }

    return NextResponse.json(verificacaoResult);
  } catch (error) {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
