"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, buscarPerguntasPorUsuario, buscarVerificacaoPorPerguntaIds, deletarPergunta, Pergunta } from "@/lib/firebase";
import {
  MoreVerticalIcon,
  Calendar03Icon,
  Settings01Icon,
  Logout01Icon,
  Attachment01Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Cancel01Icon,
  MessageQuestionIcon
} from "hugeicons-react";
import { House, Question, NotePencil, Wallet, BookmarkSimple, GearSix, SealCheck, SealWarning } from "@phosphor-icons/react";
import FooterPremium from "@/components/FooterPremium";
import toast from "react-hot-toast";

export default function MinhasPerguntas() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [perguntaParaDeletar, setPerguntaParaDeletar] = useState<Pergunta | null>(null);
  const [deletando, setDeletando] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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

  // Função para obter cor e texto do status
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'respondida':
        return {
          cor: 'bg-green-100 text-green-700',
          texto: 'Respondida',
          icone: <CheckmarkCircle02Icon size={14} />
        };
      case 'fechada':
        return {
          cor: 'bg-gray-100 text-gray-600',
          texto: 'Fechada',
          icone: <Cancel01Icon size={14} />
        };
      default:
        return {
          cor: 'bg-yellow-100 text-yellow-700',
          texto: 'Aguardando',
          icone: <Clock01Icon size={14} />
        };
    }
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

  // Carregar perguntas do usuário
  useEffect(() => {
    const carregarPerguntas = async () => {
      if (!user) return;
      try {
        const dados = await buscarPerguntasPorUsuario(user.uid);
        // Enriquecer perguntas respondidas com dados de verificação
        const respondidas = dados.filter(p => p.status === 'respondida' && p.id);
        if (respondidas.length > 0) {
          const verificacaoMap = await buscarVerificacaoPorPerguntaIds(respondidas.map(p => p.id!));
          dados.forEach(p => {
            if (p.id && verificacaoMap.has(p.id)) {
              p.respostaVerificada = verificacaoMap.get(p.id);
            }
          });
        }
        setPerguntas(dados);
      } catch (error) {
        console.error("Erro ao carregar perguntas:", error);
      } finally {
        setCarregando(false);
      }
    };
    if (user) {
      carregarPerguntas();
    }
  }, [user]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu="perfil"]')) {
        setPerfilMenuAberto(false);
      }
      if (!target.closest('[data-menu-item]')) {
        setMenuAberto(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDeletarPergunta = async () => {
    if (!perguntaParaDeletar?.id) return;

    setDeletando(true);
    try {
      await deletarPergunta(perguntaParaDeletar.id);
      setPerguntas(prev => prev.filter(p => p.id !== perguntaParaDeletar.id));
      setPerguntaParaDeletar(null);
    } catch {
      toast.error("Erro ao deletar pergunta. Tente novamente.");
    } finally {
      setDeletando(false);
    }
  };

  // Filtrar perguntas por status
  const perguntasFiltradas = filtroStatus
    ? perguntas.filter(p => p.status === filtroStatus)
    : perguntas;

  // Contadores de status
  const contadores = {
    todas: perguntas.length,
    aberta: perguntas.filter(p => p.status === 'aberta').length,
    respondida: perguntas.filter(p => p.status === 'respondida').length,
    fechada: perguntas.filter(p => p.status === 'fechada').length,
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Menu lateral esquerdo */}
      <div className="w-64 bg-white min-h-screen border-r border-gray-100 p-4 flex flex-col">
        {/* Logo */}
        <div className="mb-8 mt-4">
          <img src="/logo.svg" alt="Questiongo" className="w-20 h-auto" />
        </div>

        {/* Menu principal */}
        <nav className="space-y-1 flex-1">
          <a href="/home" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <House size={20} weight="fill" />
            <span>Início</span>
          </a>
          <a href="/minhas-perguntas" className="flex items-center gap-3 px-4 py-2.5 text-gray-800 bg-gray-200 rounded-full cursor-pointer" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <Question size={20} weight="fill" />
            <span>Minhas Perguntas</span>
          </a>
          <a href="/minhas-respostas" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <NotePencil size={20} weight="fill" />
            <span>Minhas Respostas</span>
          </a>
          <a href="/carteira" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <Wallet size={20} weight="fill" />
            <span>Carteira</span>
          </a>
        </nav>

        {/* Configurações no final */}
        <div className="border-t border-gray-100 pt-4">
          <a href="/configuracoes" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <GearSix size={20} weight="fill" />
            <span>Configurações</span>
          </a>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1">
        <header className="py-3 border-b border-gray-100 px-6 flex justify-between items-center">
          {/* Título da página */}
          <div>
            <h2 className="text-2xl text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
              Minhas Perguntas
            </h2>
            <p className="text-gray-500 mt-1" style={{ fontFamily: 'var(--font-medium)' }}>
              Gerencie todas as suas perguntas
            </p>
          </div>

          {/* Foto de perfil com dropdown */}
          <div className="relative" data-menu="perfil">
            <button
              onClick={() => setPerfilMenuAberto(!perfilMenuAberto)}
              className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
                </div>
              )}
            </button>

            {perfilMenuAberto && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[200px]">
                {/* Info do usuário */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.displayName || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Opções */}
                <div className="py-1">
                  <a
                    href="/configuracoes"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Settings01Icon size={18} />
                    Configurações
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer w-full"
                  >
                    <Logout01Icon size={18} />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Filtros de status */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFiltroStatus(null)}
              className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                filtroStatus === null
                  ? 'bg-[#FF4F00] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'var(--font-medium)' }}
            >
              Todas ({contadores.todas})
            </button>
            <button
              onClick={() => setFiltroStatus('aberta')}
              className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                filtroStatus === 'aberta'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'var(--font-medium)' }}
            >
              Aguardando ({contadores.aberta})
            </button>
            <button
              onClick={() => setFiltroStatus('respondida')}
              className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                filtroStatus === 'respondida'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'var(--font-medium)' }}
            >
              Respondidas ({contadores.respondida})
            </button>
            <button
              onClick={() => setFiltroStatus('fechada')}
              className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                filtroStatus === 'fechada'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ fontFamily: 'var(--font-medium)' }}
            >
              Fechadas ({contadores.fechada})
            </button>
          </div>
        </div>

        {/* Área de conteúdo */}
        <div className="p-6">
          <div className="max-w-4xl">
            <div className="border border-gray-200 rounded-xl">
              {carregando ? (
                <div className="p-8 text-center text-gray-500">
                  Carregando suas perguntas...
                </div>
              ) : perguntasFiltradas.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageQuestionIcon size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500" style={{ fontFamily: 'var(--font-medium)' }}>
                    {filtroStatus
                      ? `Você não tem perguntas ${filtroStatus === 'aberta' ? 'aguardando resposta' : filtroStatus === 'respondida' ? 'respondidas' : 'fechadas'}.`
                      : 'Você ainda não fez nenhuma pergunta.'
                    }
                  </p>
                  {!filtroStatus && (
                    <button
                      onClick={() => router.push('/home')}
                      className="mt-4 px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                      style={{ fontFamily: 'var(--font-semibold)' }}
                    >
                      Fazer uma pergunta
                    </button>
                  )}
                </div>
              ) : (
                perguntasFiltradas.map((item, index) => {
                  const statusInfo = getStatusInfo(item.status);
                  return (
                    <div key={item.id} className={`p-4 relative ${index !== perguntasFiltradas.length - 1 ? 'border-b border-gray-200' : ''}`}>
                      {/* Pill de valor e status no canto superior direito */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${statusInfo.cor}`}>
                          {statusInfo.icone}
                          {statusInfo.texto}
                        </span>
                        {item.respostaVerificada === true && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-[#00A86B]/50">
                            <SealCheck size={16} weight="fill" className="text-[#00C853]" />
                            <span className="text-gray-900">Verificada</span>
                          </span>
                        )}
                        {item.respostaVerificada === false && (
                          <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-red-100">
                            <SealWarning size={16} weight="fill" className="text-red-500" />
                            <span className="text-red-700">Possivelmente incorreta</span>
                          </span>
                        )}
                        <span className="bg-gray-100 text-gray-700 text-sm font-bold px-4 py-1.5 rounded-full">
                          R$ {item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>

                      {/* Conteúdo */}
                      <div className="pr-48">
                        {/* Matéria e Tempo */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-gray-800">{item.materia}</span>
                          <span className="text-sm text-gray-400 font-bold">•</span>
                          <span className="text-sm font-bold text-gray-400">{formatarTempoRelativo(item.criadoEm)}</span>
                        </div>

                        {/* Pergunta */}
                        <p className="text-gray-700 mb-3">
                          {item.pergunta}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">

                          {item.arquivos && item.arquivos.length > 0 && (
                            <div className="flex items-center gap-1 text-blue-500">
                              <Attachment01Icon size={14} />
                              <span className="text-xs font-medium">
                                {item.arquivos.length} {item.arquivos.length === 1 ? 'anexo' : 'anexos'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Rodapé: Botões */}
                        <div className="flex items-center gap-2">
                          {/* Menu de opções */}
                          <div className="relative" data-menu-item>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuAberto(menuAberto === item.id ? null : item.id || null);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreVerticalIcon size={20} />
                            </button>

                            {menuAberto === item.id && (
                              <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                                <button
                                  onClick={() => {
                                    setPerguntaParaDeletar(item);
                                    setMenuAberto(null);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
                                >
                                  <Delete02Icon size={16} />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Botão Ver Detalhes / Ver Resposta */}
                          <button
                            onClick={() => router.push(`/pergunta/${item.id}`)}
                            className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer ${
                              item.status === 'respondida'
                                ? 'bg-green-500 text-white hover:bg-green-600'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{ fontFamily: 'var(--font-semibold)' }}
                          >
                            {item.status === 'respondida' ? 'Ver Resposta' : 'Ver Detalhes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação de exclusão */}
      {perguntaParaDeletar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                Excluir Pergunta
              </h3>
              <button
                onClick={() => setPerguntaParaDeletar(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              <p className="text-gray-600" style={{ fontFamily: 'var(--font-medium)' }}>
                Tem certeza que deseja excluir esta pergunta? Esta ação não pode ser desfeita.
              </p>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {perguntaParaDeletar.pergunta}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setPerguntaParaDeletar(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletarPergunta}
                disabled={deletando}
                className="px-6 py-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
                style={{ fontFamily: 'var(--font-semibold)' }}
              >
                {deletando ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Premium */}
      <FooterPremium />
      <div className="h-16" />
    </div>
  );
}
