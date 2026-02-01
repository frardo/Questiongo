"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, buscarRanking, buscarMinhasStats, UserStats, getDb } from "@/lib/firebase";
import { CrownIcon, ArrowLeft01Icon, ArrowDown01Icon, Medal01Icon, StarIcon, CheckmarkCircle02Icon, MessageQuestionIcon, Location01Icon } from "hugeicons-react";
import { collection, getDocs, query, where } from "firebase/firestore";

interface RespondedorStats {
  usuarioId: string;
  usuarioNome: string;
  usuarioFoto?: string;
  totalRespostas: number;
  respostasAceitas: number;
  mediaAvaliacao: number;
  totalAvaliacoes: number;
}

export default function RankingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [periodo, setPeriodo] = useState("Semanal");
  const [menuPeriodoAberto, setMenuPeriodoAberto] = useState(false);
  const [materiaFiltro, setMateriaFiltro] = useState<string | null>(null);
  const [menuMateriaAberto, setMenuMateriaAberto] = useState(false);
  const [tipoRanking, setTipoRanking] = useState<"global" | "local">("global");
  const [menuTipoAberto, setMenuTipoAberto] = useState(false);
  const [regiaoFiltro, setRegiaoFiltro] = useState<string | null>(null);
  const [menuRegiaoAberto, setMenuRegiaoAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [rankingUsuarios, setRankingUsuarios] = useState<UserStats[]>([]);
  const [respondedoresStats, setRespondedoresStats] = useState<RespondedorStats[]>([]);
  const [meuRanking, setMeuRanking] = useState({ posicao: 0, atividades: 0 });

  const regioes = [
    "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul",
    "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí",
    "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia",
    "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
  ];

  const materias = [
    "Todas as matérias",
    "Matemática", "Português", "Física", "Química", "Biologia",
    "História", "Geografia", "Inglês", "Filosofia", "Sociologia",
    "Artes", "Ed. Física"
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu="periodo"]')) {
        setMenuPeriodoAberto(false);
      }
      if (!target.closest('[data-menu="materia"]')) {
        setMenuMateriaAberto(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mapear período para o formato do Firebase
  const mapearPeriodo = (periodo: string): 'diario' | 'semanal' | 'mensal' | 'total' => {
    switch (periodo) {
      case 'Diário': return 'diario';
      case 'Semanal': return 'semanal';
      case 'Mensal': return 'mensal';
      case 'Total': return 'total';
      default: return 'semanal';
    }
  };

  // Buscar estatísticas de respondedores
  const buscarRespondedoresStats = async (materia?: string | null) => {
    try {
      // Buscar todas as respostas
      let respostasQuery = materia && materia !== "Todas as matérias"
        ? query(collection(getDb(), 'respostas'), where('perguntaMateria', '==', materia))
        : query(collection(getDb(), 'respostas'));

      const respostasSnapshot = await getDocs(respostasQuery);

      // Agrupar por usuário
      const statsMap = new Map<string, RespondedorStats>();

      for (const doc of respostasSnapshot.docs) {
        const resposta = doc.data();
        const userId = resposta.usuarioId;

        if (!statsMap.has(userId)) {
          statsMap.set(userId, {
            usuarioId: userId,
            usuarioNome: resposta.usuarioNome || 'Usuário',
            usuarioFoto: resposta.usuarioFoto,
            totalRespostas: 0,
            respostasAceitas: 0,
            mediaAvaliacao: 0,
            totalAvaliacoes: 0
          });
        }

        const stats = statsMap.get(userId)!;
        stats.totalRespostas++;

        if (resposta.status === 'aceita') {
          stats.respostasAceitas++;
        }

        // Se tiver avaliação, incluir na média
        if (resposta.avaliacao && resposta.avaliacao > 0) {
          const totalAtual = stats.mediaAvaliacao * stats.totalAvaliacoes;
          stats.totalAvaliacoes++;
          stats.mediaAvaliacao = (totalAtual + resposta.avaliacao) / stats.totalAvaliacoes;
        }
      }

      // Converter para array e ordenar
      const statsArray = Array.from(statsMap.values())
        .sort((a, b) => {
          // Ordenar por respostas aceitas, depois por média de avaliação
          if (b.respostasAceitas !== a.respostasAceitas) {
            return b.respostasAceitas - a.respostasAceitas;
          }
          return b.mediaAvaliacao - a.mediaAvaliacao;
        })
        .slice(0, 20);

      setRespondedoresStats(statsArray);
    } catch (error) {
      console.error('Erro ao buscar stats de respondedores:', error);
    }
  };

  // Carregar ranking
  useEffect(() => {
    const carregarRanking = async () => {
      setCarregando(true);
      try {
        const periodoFirebase = mapearPeriodo(periodo);
        const dados = await buscarRanking(periodoFirebase, 20);
        setRankingUsuarios(dados);

        if (user) {
          const stats = await buscarMinhasStats(user.uid, periodoFirebase);
          setMeuRanking({
            posicao: stats.posicao,
            atividades: stats.atividades
          });
        }

        // Buscar stats de respondedores
        await buscarRespondedoresStats(materiaFiltro);
      } catch (error) {
        console.error("Erro ao carregar ranking:", error);
      } finally {
        setCarregando(false);
      }
    };
    carregarRanking();
  }, [periodo, user, materiaFiltro]);

  // Obter atividades baseado no período
  const getAtividades = (usuario: UserStats) => {
    switch (periodo) {
      case 'Diário': return usuario.atividadesHoje;
      case 'Semanal': return usuario.atividadesSemana;
      case 'Mensal': return usuario.atividadesMes;
      default: return usuario.atividadesTotal;
    }
  };

  // Renderizar medalha/posição
  const renderPosicao = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
          <CrownIcon size={20} className="text-white" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
          <Medal01Icon size={20} className="text-white" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-md">
          <Medal01Icon size={20} className="text-white" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
        <span className="text-gray-600 font-bold">{index + 1}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/home')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft01Icon size={24} />
            </button>
            <div className="flex items-center gap-3">
              <CrownIcon size={28} className="text-yellow-500" />
              <h1 className="text-2xl text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                Ranking de Respondedores
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Filtro de Período */}
            <div className="relative" data-menu="periodo">
              <button
                onClick={() => setMenuPeriodoAberto(!menuPeriodoAberto)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                {periodo}
                <ArrowDown01Icon size={16} />
              </button>

              {menuPeriodoAberto && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[150px]">
                  {["Diário", "Semanal", "Mensal", "Total"].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPeriodo(p);
                        setMenuPeriodoAberto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 cursor-pointer transition-colors ${
                        periodo === p ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'var(--font-medium)' }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Filtro de Matéria */}
            <div className="relative" data-menu="materia">
              <button
                onClick={() => setMenuMateriaAberto(!menuMateriaAberto)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                {materiaFiltro || "Todas as matérias"}
                <ArrowDown01Icon size={16} />
              </button>

              {menuMateriaAberto && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50 min-w-[200px] max-h-80 overflow-y-auto">
                  {materias.map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMateriaFiltro(m === "Todas as matérias" ? null : m);
                        setMenuMateriaAberto(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-100 cursor-pointer transition-colors ${
                        (materiaFiltro === m || (m === "Todas as matérias" && !materiaFiltro))
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700'
                      }`}
                      style={{ fontFamily: 'var(--font-medium)' }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ranking de Atividades */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-bold)' }}>
                <MessageQuestionIcon size={24} />
                Mais Ativos
              </h2>
              <p className="text-blue-100 text-sm mt-1">Ranking por perguntas e respostas</p>
            </div>

            <div className="p-4">
              {carregando ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Carregando...
                </div>
              ) : rankingUsuarios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma atividade registrada ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {rankingUsuarios.map((usuario, index) => {
                    const isCurrentUser = user && usuario.usuarioId === user.uid;
                    return (
                    <div
                      key={usuario.usuarioId}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                        isCurrentUser
                          ? 'bg-blue-50 ring-2 ring-blue-300'
                          : index < 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {renderPosicao(index)}

                      <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                        {usuario.usuarioFoto ? (
                          <img src={usuario.usuarioFoto} alt={usuario.usuarioNome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {usuario.usuarioNome?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className={`font-semibold ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>{isCurrentUser ? 'Você' : usuario.usuarioNome}</p>
                        <p className={`text-sm ${isCurrentUser ? 'text-blue-600' : 'text-gray-500'}`}>{getAtividades(usuario)} atividades</p>
                      </div>

                      {index < 3 && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          #{index + 1}
                        </div>
                      )}
                    </div>
                    );
                  })}

                  {/* Minha posição - só mostrar se fora do top 20 */}
                  {user && meuRanking.posicao > 20 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{meuRanking.posicao}</span>
                        </div>

                        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt="Você" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                              {user.displayName?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="font-semibold text-blue-700">Você</p>
                          <p className="text-sm text-blue-600">{meuRanking.atividades} atividades</p>
                        </div>

                        <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                          #{meuRanking.posicao}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ranking de Respondedores */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h2 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-bold)' }}>
                <CheckmarkCircle02Icon size={24} />
                Melhores Respondedores
              </h2>
              <p className="text-green-100 text-sm mt-1">Ranking por respostas aceitas e avaliações</p>
            </div>

            <div className="p-4">
              {carregando ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Carregando...
                </div>
              ) : respondedoresStats.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum respondedor encontrado ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {respondedoresStats.map((respondedor, index) => (
                    <div
                      key={respondedor.usuarioId}
                      className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                        index < 3 ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {renderPosicao(index)}

                      <div className="w-12 h-12 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                        {respondedor.usuarioFoto ? (
                          <img src={respondedor.usuarioFoto} alt={respondedor.usuarioNome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                            {respondedor.usuarioNome?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{respondedor.usuarioNome}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {respondedor.respostasAceitas} aceitas
                          </span>
                          <span className="text-xs text-gray-500">
                            {respondedor.totalRespostas} total
                          </span>
                        </div>
                      </div>

                      {/* Avaliação média */}
                      {respondedor.totalAvaliacoes > 0 && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                          <StarIcon size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-yellow-700">
                            {respondedor.mediaAvaliacao.toFixed(1)}
                          </span>
                        </div>
                      )}

                      {index < 3 && (
                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-100 text-gray-600' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          #{index + 1}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dica */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Como subir no ranking?</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-1">•</span>
              <span>Faça perguntas bem elaboradas para ganhar pontos de atividade</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">•</span>
              <span>Responda perguntas de outros usuários com qualidade</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-500 mt-1">•</span>
              <span>Tenha suas respostas aceitas e bem avaliadas para liderar o ranking</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
