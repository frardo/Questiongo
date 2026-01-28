"use client";

import { useState } from "react";
import { StarIcon, InformationCircleIcon, AlertDiamondIcon } from "hugeicons-react";
import { SealCheck } from "@phosphor-icons/react";
import DOMPurify from "isomorphic-dompurify";

interface RespostaVerificadaProps {
  resposta: {
    id?: string;
    usuarioNome: string;
    usuarioFoto?: string;
    resposta: string;
    explicacao: string;
    arquivos?: string[];
    verificada?: boolean;
    confiancaIA?: number;
    criadoEm?: { toDate: () => Date };
  };
  estatisticasRespondedor?: {
    totalRespostas?: number;
    pessoasAjudadas?: number;
    avaliacao?: number;
  };
  onAvaliar?: (nota: number) => void;
  onDenunciar?: () => void;
  avaliacaoAtual?: number;
  avaliacaoEnviada?: boolean;
}

export default function RespostaVerificada({
  resposta,
  estatisticasRespondedor,
  onAvaliar,
  onDenunciar,
  avaliacaoAtual = 0,
  avaliacaoEnviada = false,
}: RespostaVerificadaProps) {
  const [avaliacao, setAvaliacao] = useState<number>(avaliacaoAtual);
  const [hoverAvaliacao, setHoverAvaliacao] = useState<number>(0);
  const [enviada, setEnviada] = useState(avaliacaoEnviada);
  const [mostrarInfoIA, setMostrarInfoIA] = useState(false);

  const handleAvaliar = (nota: number) => {
    if (enviada) return;
    setAvaliacao(nota);
    setEnviada(true);
    onAvaliar?.(nota);
  };

  // Formatar número grande (ex: 13800 -> 13.8 mil)
  const formatarNumero = (num?: number) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)} mi`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)} mil`;
    return num.toString();
  };

  // Obter classificação do respondedor baseado na avaliação
  const getClassificacao = (avaliacao?: number) => {
    if (!avaliacao) return "Iniciante";
    if (avaliacao >= 4.5) return "Excelente";
    if (avaliacao >= 4.0) return "Muito Bom";
    if (avaliacao >= 3.5) return "Bom";
    if (avaliacao >= 3.0) return "Regular";
    return "Iniciante";
  };

  const isVerificada = resposta.verificada === true;

  return (
    <div
      className={`rounded-xl overflow-hidden ${
        isVerificada
          ? "border-2 border-[#00A86B]"
          : "border border-gray-200 bg-white"
      }`}
    >
      {/* Header - Selo de Verificação */}
      {isVerificada && (
        <div className="bg-[#00A86B]/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Selo verde com V preto */}
<SealCheck size={24} weight="fill" className="text-[#00C853]" />
            <span className="text-base font-bold text-gray-900">Resposta verificada por um especialista</span>
            <button
              onClick={() => setMostrarInfoIA(!mostrarInfoIA)}
              className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
              title="Mais informações"
            >
              <InformationCircleIcon size={16} className="text-gray-700" />
            </button>
          </div>
        </div>
      )}

      {/* Info sobre verificação IA */}
      {mostrarInfoIA && isVerificada && (
        <div className="bg-[#00A86B]/10 px-4 py-3 border-b border-[#00A86B]/20">
          <p className="text-sm text-[#00563B]">
            Esta resposta foi analisada por Inteligência Artificial e considerada correta
            {resposta.confiancaIA && (
              <span className="font-semibold"> com {resposta.confiancaIA}% de confiança</span>
            )}.
            A verificação automática ajuda a garantir a qualidade das respostas.
          </p>
        </div>
      )}

      {/* Corpo */}
      <div className={`p-5 ${isVerificada ? "bg-white/60" : ""}`}>
        {/* Info do Respondedor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {resposta.usuarioFoto ? (
              <img
                src={resposta.usuarioFoto}
                alt={resposta.usuarioNome}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                {resposta.usuarioNome?.charAt(0) || "?"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{resposta.usuarioNome}</p>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span className="text-[#00A86B] font-medium">
                {getClassificacao(estatisticasRespondedor?.avaliacao)}
              </span>
              {estatisticasRespondedor?.totalRespostas && (
                <>
                  <span>•</span>
                  <span>{formatarNumero(estatisticasRespondedor.totalRespostas)} respostas</span>
                </>
              )}
              {estatisticasRespondedor?.pessoasAjudadas && (
                <>
                  <span>•</span>
                  <span>{formatarNumero(estatisticasRespondedor.pessoasAjudadas)} ajudados</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4" />

        {/* Resposta */}
        <div className="mb-4">
          <p className="text-gray-800 leading-relaxed" style={{ fontFamily: 'var(--font-medium)' }}>
            {resposta.resposta}
          </p>
        </div>

        {/* Explicação */}
        {resposta.explicacao && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 font-semibold mb-2">Explicação:</p>
            <div
              className="text-gray-700 prose prose-sm max-w-none leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(resposta.explicacao, {
                  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'],
                  ALLOWED_ATTR: []
                })
              }}
            />
          </div>
        )}

        {/* Anexos */}
        {resposta.arquivos && resposta.arquivos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {resposta.arquivos.map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors"
              >
                <span>📎</span>
                Anexo {idx + 1}
              </a>
            ))}
          </div>
        )}

        {/* Divisor */}
        <div className="border-t border-gray-200 my-4" />

        {/* Avaliação com Estrelas */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-2">Avalie esta resposta:</p>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((estrela) => (
                <div key={estrela} className="relative w-8 h-8">
                  {/* Metade esquerda - 0.5 */}
                  <button
                    onClick={() => handleAvaliar(estrela - 0.5)}
                    onMouseEnter={() => !enviada && setHoverAvaliacao(estrela - 0.5)}
                    onMouseLeave={() => !enviada && setHoverAvaliacao(0)}
                    disabled={enviada}
                    className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer disabled:cursor-default"
                  />
                  {/* Metade direita - 1.0 */}
                  <button
                    onClick={() => handleAvaliar(estrela)}
                    onMouseEnter={() => !enviada && setHoverAvaliacao(estrela)}
                    onMouseLeave={() => !enviada && setHoverAvaliacao(0)}
                    disabled={enviada}
                    className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer disabled:cursor-default"
                  />
                  {/* Estrela visual */}
                  <div className="relative w-8 h-8">
                    {/* Estrela vazia (fundo) */}
                    <StarIcon size={32} className="absolute text-gray-300" />
                    {/* Estrela preenchida (com clip) */}
                    <div
                      className="absolute overflow-hidden"
                      style={{
                        width: `${Math.min(100, Math.max(0, ((hoverAvaliacao || avaliacao) - (estrela - 1)) * 100))}%`
                      }}
                    >
                      <StarIcon size={32} className="text-yellow-400" style={{ fill: '#facc15' }} />
                    </div>
                  </div>
                </div>
              ))}
              {(hoverAvaliacao || avaliacao) > 0 && (
                <span className="ml-3 text-xl font-bold text-gray-700">
                  {(hoverAvaliacao || avaliacao).toFixed(1)}
                </span>
              )}
            </div>
            {enviada && (
              <p className="text-sm text-green-600 mt-2">Obrigado pela sua avaliação!</p>
            )}
          </div>

          {/* Botão Denunciar */}
          {onDenunciar && (
            <button
              onClick={onDenunciar}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <AlertDiamondIcon size={16} />
              Denunciar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
