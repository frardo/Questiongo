"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, buscarPerguntasSalvas, removerPerguntaSalva, Pergunta } from "@/lib/firebase";
import {
  Calendar03Icon,
  Settings01Icon,
  Logout01Icon,
  Attachment01Icon,
  BookmarkRemove02Icon,
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Cancel01Icon
} from "hugeicons-react";
import { House, Question, NotePencil, Wallet, BookmarkSimple, GearSix } from "@phosphor-icons/react";
import FooterPremium from "@/components/FooterPremium";
import toast from "react-hot-toast";

export default function Salvos() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

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

  // Carregar perguntas salvas do usuário
  useEffect(() => {
    const carregarPerguntasSalvas = async () => {
      if (!user) return;
      try {
        const dados = await buscarPerguntasSalvas(user.uid);
        setPerguntas(dados);
      } catch (error) {
        console.error("Erro ao carregar perguntas salvas:", error);
      } finally {
        setCarregando(false);
      }
    };
    if (user) {
      carregarPerguntasSalvas();
    }
  }, [user]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu="perfil"]')) {
        setPerfilMenuAberto(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRemoverSalvo = async (perguntaId: string) => {
    if (!user) return;

    setRemovendo(perguntaId);
    try {
      await removerPerguntaSalva(user.uid, perguntaId);
      setPerguntas(prev => prev.filter(p => p.id !== perguntaId));
    } catch {
      toast.error("Erro ao remover pergunta salva. Tente novamente.");
    } finally {
      setRemovendo(null);
    }
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
          <a href="/minhas-perguntas" className="flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full cursor-pointer transition-colors" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
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
          <a href="/salvos" className="flex items-center gap-3 px-4 py-2.5 text-gray-800 bg-gray-200 rounded-full cursor-pointer" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <BookmarkSimple size={20} weight="fill" />
            <span>Salvos</span>
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
            <h2 className="text-2xl text-gray-900 font-bold">
              Salvos
            </h2>
            <p className="text-gray-500 mt-1 font-medium">
              Perguntas que você salvou para responder depois
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

        {/* Área de conteúdo */}
        <div className="p-6">
          <div className="max-w-4xl">
            <div className="border border-gray-200 rounded-xl">
              {carregando ? (
                <div className="p-8 text-center text-gray-500">
                  Carregando perguntas salvas...
                </div>
              ) : perguntas.length === 0 ? (
                <div className="p-8 text-center">
                  <Bookmark02Icon size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">
                    Você ainda não salvou nenhuma pergunta.
                  </p>
                  <p className="text-gray-400 text-sm mt-2 font-medium">
                    Clique no ícone de bookmark nas perguntas do mercado para salvá-las aqui.
                  </p>
                  <button
                    onClick={() => router.push('/home')}
                    className="mt-4 px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer font-semibold"
                  >
                    Explorar perguntas
                  </button>
                </div>
              ) : (
                perguntas.map((item, index) => {
                  const statusInfo = getStatusInfo(item.status);
                  return (
                    <div key={item.id} className={`p-4 relative ${index !== perguntas.length - 1 ? 'border-b border-gray-200' : ''}`}>
                      {/* Pill de valor e status no canto superior direito */}
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${statusInfo.cor}`}>
                          {statusInfo.icone}
                          {statusInfo.texto}
                        </span>
                        <span className="bg-gray-100 text-gray-700 text-sm font-bold px-4 py-1.5 rounded-full">
                          R$ {item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>

                      {/* Conteúdo */}
                      <div className="pr-48">
                        {/* Usuário e Tempo */}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-gray-300 overflow-hidden">
                            {item.usuarioFoto ? (
                              <img src={item.usuarioFoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                {item.usuarioNome?.charAt(0) || "?"}
                              </div>
                            )}
                          </div>
                          <span className="text-sm font-bold text-gray-800">{item.materia}</span>
                          <span className="text-sm text-gray-400 font-bold">•</span>
                          <span className="text-sm font-bold text-gray-400">{formatarTempoRelativo(item.criadoEm)}</span>
                        </div>

                        {/* Pergunta */}
                        <p className="text-gray-700 mb-3">
                          {item.pergunta}
                        </p>

                        {/* Data de entrega e indicador de imagem */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar03Icon size={16} />
                            <span>Entregar até {item.dataEntrega}</span>
                          </div>
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
                          {/* Botão Remover dos salvos */}
                          <button
                            onClick={() => item.id && handleRemoverSalvo(item.id)}
                            disabled={removendo === item.id}
                            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 font-medium"
                          >
                            <BookmarkRemove02Icon size={18} />
                            {removendo === item.id ? 'Removendo...' : 'Remover'}
                          </button>

                          {/* Botão Responder (se aberta) */}
                          {item.status === 'aberta' && (
                            <button
                              onClick={() => router.push(`/responder/${item.id}`)}
                              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600 transition-colors cursor-pointer font-semibold"
                            >
                              Responder
                            </button>
                          )}

                          {/* Botão Ver Resposta (se respondida) */}
                          {item.status === 'respondida' && (
                            <button
                              onClick={() => router.push(`/pergunta/${item.id}`)}
                              className="px-4 py-2 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition-colors cursor-pointer font-semibold"
                            >
                              Ver Resposta
                            </button>
                          )}
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

      {/* Rodapé Premium */}
      <FooterPremium />
      <div className="h-16" />
    </div>
  );
}
