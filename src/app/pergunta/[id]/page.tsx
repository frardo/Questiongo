"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, buscarPerguntaPorId, buscarRespostaPorPerguntaId, atualizarResposta, atualizarPergunta, buscarPerguntasPorMateria, Pergunta, Resposta } from "@/lib/firebase";
import DOMPurify from "isomorphic-dompurify";
import toast from "react-hot-toast";
import {
  Calendar03Icon,
  CheckmarkCircle02Icon,
  Cancel01Icon,
  Clock01Icon,
  ArrowLeft02Icon,
  PencilEdit02Icon,
  ArrowRight01Icon,
  SparklesIcon,
  StarIcon,
  PlayIcon
} from "hugeicons-react";

export default function VisualizarPergunta() {
  const router = useRouter();
  const params = useParams();
  const perguntaId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [resposta, setResposta] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState<'aceitar' | 'rejeitar' | null>(null);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);
  const [mensagemPagamento, setMensagemPagamento] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<number>(0);
  const [hoverAvaliacao, setHoverAvaliacao] = useState<number>(0);
  const [avaliacaoEnviada, setAvaliacaoEnviada] = useState(false);
  const [videos, setVideos] = useState<Array<{
    id: string;
    titulo: string;
    thumbnail: string;
    canal: string;
    url: string;
  }>>([]);
  const [carregandoVideos, setCarregandoVideos] = useState(false);
  const [outrasPerguntas, setOutrasPerguntas] = useState<Pergunta[]>([]);

  // Função para formatar tempo relativo
  const formatarTempoRelativo = (timestamp: { toDate: () => Date }) => {
    const agora = new Date();
    const data = timestamp.toDate();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras < 24) return `há ${diffHoras} hora${diffHoras > 1 ? 's' : ''}`;
    if (diffDias < 30) return `há ${diffDias} dia${diffDias > 1 ? 's' : ''}`;
    return data.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
        return;
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  // Carregar pergunta e resposta
  useEffect(() => {
    const carregarDados = async () => {
      if (!perguntaId) return;

      try {
        const perguntaData = await buscarPerguntaPorId(perguntaId);
        setPergunta(perguntaData);

        if (perguntaData) {
          const respostaData = await buscarRespostaPorPerguntaId(perguntaId);
          setResposta(respostaData);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, [perguntaId]);

  // Buscar vídeos relacionados
  useEffect(() => {
    const buscarVideos = async () => {
      if (!pergunta?.pergunta || !pergunta?.materia) return;

      setCarregandoVideos(true);
      try {
        // Combinar matéria + conteúdo da pergunta para busca mais precisa
        const termoBusca = `${pergunta.materia} ${pergunta.pergunta}`;
        const response = await fetch(`/api/youtube?q=${encodeURIComponent(termoBusca)}`);
        const data = await response.json();

        if (data.videos && data.videos.length > 0) {
          setVideos(data.videos);
        } else {
          setVideos([]);
        }
      } catch (error) {
        console.error('Erro ao buscar vídeos:', error);
        setVideos([]);
      } finally {
        setCarregandoVideos(false);
      }
    };

    buscarVideos();
  }, [pergunta]);

  // Buscar outras perguntas da mesma matéria
  useEffect(() => {
    const buscarOutrasPerguntas = async () => {
      if (!pergunta?.materia || !perguntaId) return;

      try {
        const outras = await buscarPerguntasPorMateria(pergunta.materia, perguntaId, 4);
        setOutrasPerguntas(outras);
      } catch (error) {
        console.error('Erro ao buscar outras perguntas:', error);
      }
    };

    buscarOutrasPerguntas();
  }, [pergunta, perguntaId]);

  // Verificar se o usuário é o dono da pergunta
  const ehDonoDaPergunta = user && pergunta && user.uid === pergunta.usuarioId;

  // Verificar pagamento automaticamente ao carregar a página
  useEffect(() => {
    const verificarPagamentoAuto = async () => {
      if (!ehDonoDaPergunta || !resposta?.id || resposta.status !== 'pendente' || !pergunta) return;

      setVerificandoPagamento(true);
      try {
        const response = await fetch('/api/pagamento/verificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            perguntaId,
            respostaId: resposta.id,
          }),
        });

        const data = await response.json();

        if (data.success && data.status === 'aceita') {
          setMensagemPagamento('Pagamento confirmado! Resposta liberada.');
          setResposta(prev => prev ? { ...prev, status: 'aceita' } : null);
          setPergunta(prev => prev ? { ...prev, status: 'respondida' } : null);
        }
      } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
      } finally {
        setVerificandoPagamento(false);
      }
    };

    verificarPagamentoAuto();
  }, [ehDonoDaPergunta, resposta?.id, resposta?.status, pergunta, perguntaId]);

  // Aceitar resposta - redireciona para pagamento
  const handleAceitarResposta = async () => {
    if (!resposta?.id || !pergunta) return;

    setProcessando(true);
    try {
      const response = await fetch('/api/pagamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perguntaId,
          respostaId: resposta.id,
          valor: pergunta.valor,
          usuarioNome: user?.displayName || '',
          usuarioEmail: user?.email || '',
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Erro ao criar cobrança');
      }
    } catch {
      toast.error("Erro ao processar pagamento. Tente novamente.");
      setProcessando(false);
    }
  };

  // Rejeitar resposta
  const handleRejeitarResposta = async () => {
    if (!resposta?.id) return;

    setProcessando(true);
    try {
      await atualizarResposta(resposta.id, { status: 'rejeitada' });
      await atualizarPergunta(perguntaId, { status: 'aberta' });

      setResposta(prev => prev ? { ...prev, status: 'rejeitada' } : null);
      setPergunta(prev => prev ? { ...prev, status: 'aberta' } : null);
      setModalConfirmacao(null);
    } catch {
      toast.error("Erro ao rejeitar resposta. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  };

  // Verificar se pagamento foi realizado
  const handleVerificarPagamento = async () => {
    if (!resposta?.id || !pergunta) return;

    setVerificandoPagamento(true);
    setMensagemPagamento(null);

    try {
      const response = await fetch('/api/pagamento/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perguntaId,
          respostaId: resposta.id,
        }),
      });

      const data = await response.json();

      if (data.success && data.status === 'aceita') {
        setMensagemPagamento('Pagamento confirmado! Resposta liberada.');
        setResposta(prev => prev ? { ...prev, status: 'aceita' } : null);
        setPergunta(prev => prev ? { ...prev, status: 'respondida' } : null);
      } else {
        setMensagemPagamento(data.message || 'Pagamento ainda não identificado.');
      }
    } catch (error) {
      console.error("Erro ao verificar pagamento:", error);
      setMensagemPagamento('Erro ao verificar. Tente novamente.');
    } finally {
      setVerificandoPagamento(false);
    }
  };

  // Obter info do status da resposta
  const getStatusRespostaInfo = (status: string) => {
    switch (status) {
      case 'aceita':
        return { cor: 'bg-green-100 text-green-700', texto: 'Aceita', iconeType: 'check' as const };
      case 'rejeitada':
        return { cor: 'bg-red-100 text-red-700', texto: 'Rejeitada', iconeType: 'cancel' as const };
      default:
        return { cor: 'bg-yellow-100 text-yellow-700', texto: 'Pendente', iconeType: 'clock' as const };
    }
  };

  const renderStatusIcon = (iconeType: 'check' | 'cancel' | 'clock') => {
    switch (iconeType) {
      case 'check':
        return <CheckmarkCircle02Icon size={16} />;
      case 'cancel':
        return <Cancel01Icon size={16} />;
      case 'clock':
        return <Clock01Icon size={16} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ArrowLeft02Icon size={20} />
            <span style={{ fontFamily: 'var(--font-medium)' }}>Voltar</span>
          </button>
          <a href="/home">
            <img src="/logo.svg" alt="Questiongo" className="h-12 w-auto" />
          </a>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column - Question and Answer */}
          <div className="lg:col-span-2">
            {carregando ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Carregando pergunta...</p>
              </div>
            ) : !pergunta ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <p className="text-gray-500">Pergunta não encontrada.</p>
                <button
                  onClick={() => router.push('/home')}
                  className="mt-4 px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-semibold)' }}
                >
                  Voltar ao Início
                </button>
              </div>
            ) : (
              <>
                {/* Question Box */}
                <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      {pergunta.usuarioFoto ? (
                        <img src={pergunta.usuarioFoto} alt={pergunta.usuarioNome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          {pergunta.usuarioNome?.charAt(0) || "?"}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{pergunta.usuarioNome}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{formatarTempoRelativo(pergunta.criadoEm)}</span>
                        <span>•</span>
                        <span className="text-blue-600">{pergunta.materia}</span>
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
                      R$ {pergunta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Question Content */}
                  <div className="text-gray-800 text-lg leading-relaxed mb-4" style={{ fontFamily: 'var(--font-medium)' }}>
                    {pergunta.pergunta}
                  </div>

                  {/* Attachments */}
                  {pergunta.arquivos && pergunta.arquivos.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {pergunta.arquivos.map((url, idx) => (
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Anexo ${idx + 1}`} className="w-full h-28 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar03Icon size={16} />
                      <span>Entregar até {pergunta.dataEntrega}</span>
                    </div>
                    {!ehDonoDaPergunta && !resposta && (
                      <button
                        onClick={() => router.push(`/responder/${perguntaId}`)}
                        className="px-5 py-2.5 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-2 text-sm"
                        style={{ fontFamily: 'var(--font-bold)' }}
                      >
                        <PencilEdit02Icon size={16} />
                        Responder +R$ {(pergunta.valor * 0.85).toFixed(2)}
                      </button>
                    )}
                  </div>
                </div>

                {/* Answer Box */}
                {resposta && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Resposta</h3>
                      <span className={`flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ${getStatusRespostaInfo(resposta.status).cor}`}>
                        {renderStatusIcon(getStatusRespostaInfo(resposta.status).iconeType)}
                        {getStatusRespostaInfo(resposta.status).texto}
                      </span>
                    </div>

                    {/* Respondent */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                        {resposta.usuarioFoto ? (
                          <img src={resposta.usuarioFoto} alt={resposta.usuarioNome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold">
                            {resposta.usuarioNome?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{resposta.usuarioNome}</p>
                        <p className="text-sm text-gray-500">{formatarTempoRelativo(resposta.criadoEm)}</p>
                      </div>
                    </div>

                    {/* Content - Protected or Full */}
                    {ehDonoDaPergunta && resposta.status === 'pendente' ? (
                      <>
                        {/* Protected - Blur com botão Desbloquear */}
                        <div className="relative rounded-xl overflow-hidden mb-4">
                          <div className="blur-md select-none pointer-events-none text-gray-600 p-6 bg-gray-100">
                            <p className="mb-3">{resposta.resposta}</p>
                            {resposta.explicacao && (
                              <div className="mt-4 pt-4 border-t border-gray-200">
                                <p>{resposta.explicacao.replace(/<[^>]*>/g, '').substring(0, 300)}...</p>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <button
                              onClick={() => setModalConfirmacao('aceitar')}
                              className="px-8 py-3 bg-white text-gray-900 rounded-full shadow-lg hover:bg-gray-100 transition-all hover:scale-105 cursor-pointer"
                              style={{ fontFamily: 'var(--font-bold)' }}
                            >
                              Desbloquear
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <button
                            onClick={() => setModalConfirmacao('rejeitar')}
                            className="text-red-600 text-sm hover:text-red-700 transition-colors cursor-pointer"
                            style={{ fontFamily: 'var(--font-medium)' }}
                          >
                            Rejeitar resposta
                          </button>

                          {verificandoPagamento && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              Verificando pagamento...
                            </div>
                          )}

                          {mensagemPagamento && (
                            <p className={`text-sm ${mensagemPagamento.includes('confirmado') ? 'text-green-600' : 'text-orange-600'}`}>
                              {mensagemPagamento}
                            </p>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Full Content */}
                        <div className="bg-blue-50 rounded-xl p-5 mb-4">
                          <p className="text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                            {resposta.resposta}
                          </p>
                        </div>

                        {resposta.explicacao && (
                          <div className="bg-gray-50 rounded-xl p-5 mb-4">
                            <p className="text-sm text-gray-600 font-semibold mb-2">Explicação:</p>
                            <div
                              className="text-gray-700 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(resposta.explicacao, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'], ALLOWED_ATTR: [] }) }}
                            />
                          </div>
                        )}

                        {resposta.arquivos && resposta.arquivos.length > 0 && (
                          <div className="grid grid-cols-3 gap-3 mb-4">
                            {resposta.arquivos.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                <img src={url} alt={`Anexo ${idx + 1}`} className="w-full h-28 object-cover rounded-xl border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer" />
                              </a>
                            ))}
                          </div>
                        )}

                        {resposta.status === 'aceita' && (
                          <div className="flex items-center gap-2 pt-4 border-t border-gray-100 text-green-600 text-sm">
                            <CheckmarkCircle02Icon size={18} />
                            <span>Resposta aceita. Valor liberado para o respondedor.</span>
                          </div>
                        )}

                        {/* Avaliação com Estrelas (suporta meia estrela) */}
                        <div className="mt-6 pt-5 border-t border-gray-100">
                          <p className="text-sm text-gray-600 mb-3 font-medium">Avalie esta resposta:</p>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((estrela) => (
                              <div key={estrela} className="relative w-8 h-8">
                                {/* Metade esquerda - 0.5 */}
                                <button
                                  onClick={() => {
                                    if (!avaliacaoEnviada) {
                                      setAvaliacao(estrela - 0.5);
                                      setAvaliacaoEnviada(true);
                                    }
                                  }}
                                  onMouseEnter={() => !avaliacaoEnviada && setHoverAvaliacao(estrela - 0.5)}
                                  onMouseLeave={() => !avaliacaoEnviada && setHoverAvaliacao(0)}
                                  disabled={avaliacaoEnviada}
                                  className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
                                />
                                {/* Metade direita - 1.0 */}
                                <button
                                  onClick={() => {
                                    if (!avaliacaoEnviada) {
                                      setAvaliacao(estrela);
                                      setAvaliacaoEnviada(true);
                                    }
                                  }}
                                  onMouseEnter={() => !avaliacaoEnviada && setHoverAvaliacao(estrela)}
                                  onMouseLeave={() => !avaliacaoEnviada && setHoverAvaliacao(0)}
                                  disabled={avaliacaoEnviada}
                                  className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
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
                          {avaliacaoEnviada && (
                            <p className="text-sm text-green-600 mt-2">Obrigado pela sua avaliação!</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* No Answer */}
                {!resposta && (
                  <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                    <Clock01Icon size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Aguardando resposta...</p>
                    <p className="text-gray-400 text-sm mt-1">Você será notificado quando alguém responder.</p>
                  </div>
                )}

                {/* Vídeos Recomendados - só aparece se tiver vídeos */}
                {videos.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <PlayIcon size={22} className="text-red-500" />
                      <h3 className="text-lg font-bold text-gray-900">Encontre soluções em vídeos</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {videos.map((video) => (
                        <a
                          key={video.id}
                          href={video.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group block bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-all"
                        >
                          <div className="relative">
                            <img
                              src={video.thumbnail}
                              alt={video.titulo}
                              className="w-full h-28 object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                                <PlayIcon size={24} className="text-white ml-1" />
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {video.titulo}
                            </p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{video.canal}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outras Perguntas da Mesma Matéria */}
                {pergunta && (
                  <div className="bg-white rounded-2xl p-6 shadow-sm mt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Ajude outras pessoas com dúvidas sobre {pergunta.materia}
                    </h3>

                    {outrasPerguntas.length > 0 ? (
                      <div className="space-y-3">
                        {outrasPerguntas.map((outra) => (
                          <a
                            key={outra.id}
                            href={`/pergunta/${outra.id}`}
                            className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                {outra.usuarioFoto ? (
                                  <img src={outra.usuarioFoto} alt={outra.usuarioNome} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                    {outra.usuarioNome?.charAt(0) || "?"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                  {outra.pergunta}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-xs text-gray-500">{outra.usuarioNome}</span>
                                  <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    R$ {outra.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              <PencilEdit02Icon size={18} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <p className="text-sm">Nenhuma outra pergunta sobre {pergunta.materia} no momento.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="text-center mb-5">
                <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-4 border-dashed border-green-300 p-1">
                  <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xl font-bold overflow-hidden">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"
                    )}
                  </div>
                </div>
                <p className="font-semibold text-gray-900">{user?.displayName || "Usuário"}</p>
                <span className="inline-block mt-2 bg-green-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                  Aluno
                </span>
              </div>

              <div className="flex justify-center gap-6 py-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                  <SparklesIcon size={18} className="text-yellow-500" />
                  <span><strong>120</strong> pts</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-lg">👑</span>
                  <span><strong>0</strong></span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Plano atual</p>
                <p className="font-bold text-gray-900 mb-4">Questiongo Básico</p>

                <div className="space-y-3">
                  <a href="/carteira" className="flex items-center justify-between text-blue-500 text-sm font-medium hover:text-blue-600 transition-colors cursor-pointer">
                    Ver Minha Carteira
                    <ArrowRight01Icon size={16} />
                  </a>
                  <a href="/minhas-perguntas" className="flex items-center justify-between text-blue-500 text-sm font-medium hover:text-blue-600 transition-colors cursor-pointer">
                    Minhas Perguntas
                    <ArrowRight01Icon size={16} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalConfirmacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                {modalConfirmacao === 'aceitar' ? 'Aceitar Resposta' : 'Rejeitar Resposta'}
              </h3>
              <button
                onClick={() => setModalConfirmacao(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            <div className="p-6">
              {modalConfirmacao === 'aceitar' ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl mb-4">
                    <CheckmarkCircle02Icon size={32} className="text-green-500" />
                    <div>
                      <p className="font-semibold text-green-800">Pagar e aceitar resposta</p>
                      <p className="text-sm text-green-600">Valor: R$ {pergunta?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via PIX</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Ao continuar, você será redirecionado para a página de pagamento via PIX.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl mb-4">
                    <Cancel01Icon size={32} className="text-red-500" />
                    <div>
                      <p className="font-semibold text-red-800">Confirmar rejeição</p>
                      <p className="text-sm text-red-600">A pergunta voltará a ficar aberta.</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">
                    Ao rejeitar, sua pergunta voltará ao mercado para novas respostas.
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setModalConfirmacao(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={modalConfirmacao === 'aceitar' ? handleAceitarResposta : handleRejeitarResposta}
                disabled={processando}
                className={`px-6 py-2.5 text-white rounded-full transition-colors cursor-pointer disabled:opacity-50 ${
                  modalConfirmacao === 'aceitar'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                style={{ fontFamily: 'var(--font-semibold)' }}
              >
                {processando ? 'Processando...' : modalConfirmacao === 'aceitar' ? 'Pagar via PIX' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
