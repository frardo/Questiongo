"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, criarPergunta, buscarPerguntasComRespostas, ouvirPerguntasComRespostas, uploadArquivos, uploadArquivo, atualizarFotoPerfil, Pergunta, buscarRanking, buscarMinhasStats, UserStats, buscarNotificacoes, Notificacao, buscarSaldo, Saldo, criarDenuncia } from "@/lib/firebase";
import { MoreVerticalIcon, CrownIcon, ArrowDown01Icon, Settings01Icon, Logout01Icon, CompassIcon, MessageQuestionIcon, PencilEdit02Icon, MoneyBag02Icon, Cancel01Icon, Attachment01Icon, InformationCircleIcon, Wallet02Icon, Mail01Icon, CheckmarkCircle02Icon, RankingIcon, Camera01Icon } from "hugeicons-react";
import { Books, Calculator, Bank, Globe, Dna, PencilLine, Atom, Flask, Brain, Users, Briefcase, GraduationCap, Translate, Palette, FirstAidKit, SoccerBall, ChartLine, Scales, Desktop, PuzzlePiece, Sparkle, MusicNotes, Wrench, House, Question, NotePencil, Wallet, GearSix, SealCheck, SealWarning } from "@phosphor-icons/react";
import FooterPremium from "@/components/FooterPremium";
import toast from "react-hot-toast";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [menuAberto, setMenuAberto] = useState<string | null>(null);
  const [rankingPeriodo, setRankingPeriodo] = useState("Semanal");
  const [rankingMenuAberto, setRankingMenuAberto] = useState(false);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [ganhosPeriodo, setGanhosPeriodo] = useState("Todo o período");
  const [ganhosMenuAberto, setGanhosMenuAberto] = useState(false);
  const [materiaFiltro, setMateriaFiltro] = useState<string | null>(null);
  const [nivelFiltro, setNivelFiltro] = useState<string>('todos');
  const [statusFiltro, setStatusFiltro] = useState<string>('sem_resposta');
  const [nivelSelecionado, setNivelSelecionado] = useState<string>('');

  // Estados do modal de pergunta
  const [modalPerguntaAberto, setModalPerguntaAberto] = useState(false);
  const [textoPergunta, setTextoPergunta] = useState("");
  const [materiaSelecionada, setMateriaSelecionada] = useState("");
  const [valorSelecionado, setValorSelecionado] = useState(10);


  const [materiaMenuAberto, setMateriaMenuAberto] = useState(false);
  const [mostrarSimbolosModal, setMostrarSimbolosModal] = useState(false);
  const [mostrarEquacaoModal, setMostrarEquacaoModal] = useState(false);
  const [equacaoModal, setEquacaoModal] = useState("");
  const [perguntaSelecionada, setPerguntaSelecionada] = useState<Pergunta | null>(null);

  // Estados do modal de alteração de foto
  const [modalFotoAberto, setModalFotoAberto] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // Função para selecionar arquivo de foto
  const handleSelecionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      // Validar tipo de arquivo
      if (!arquivo.type.startsWith('image/')) {
        toast.error('Por favor, selecione apenas imagens.');
        return;
      }
      // Validar tamanho (max 5MB)
      if (arquivo.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }
      setArquivoFoto(arquivo);
      setPreviewFoto(URL.createObjectURL(arquivo));
    }
  };

  // Função para fazer upload e atualizar foto de perfil
  const handleAtualizarFoto = async () => {
    if (!arquivoFoto) return;

    setUploadingFoto(true);
    try {
      // Upload para Cloudinary
      const url = await uploadArquivo(arquivoFoto, 'perfil');
      // Atualizar Firebase Auth
      await atualizarFotoPerfil(url);
      // Fechar modal e limpar estados
      setModalFotoAberto(false);
      setArquivoFoto(null);
      setPreviewFoto(null);
      // Recarregar página para atualizar a foto em todos os lugares
      window.location.reload();
    } catch {
      toast.error('Erro ao atualizar foto. Tente novamente.');
    } finally {
      setUploadingFoto(false);
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

  const [rankingUsuarios, setRankingUsuarios] = useState<UserStats[]>([]);
  const [meuRanking, setMeuRanking] = useState({ posicao: 0, atividades: 0 });
  const [carregandoRanking, setCarregandoRanking] = useState(true);
  const [rankingExpandido, setRankingExpandido] = useState(false);
  const [saldo, setSaldo] = useState<Saldo | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Carregar saldo do usuário
  useEffect(() => {
    const carregarSaldo = async () => {
      if (!user) return;
      try {
        const saldoData = await buscarSaldo(user.uid);
        setSaldo(saldoData);
      } catch (error) {
        console.error("Erro ao carregar saldo:", error);
      }
    };
    if (user) {
      carregarSaldo();
    }
  }, [user]);

  // Carregar perguntas do Firestore em tempo real
  useEffect(() => {
    const unsubscribe = ouvirPerguntasComRespostas((dados) => {
      setPerguntas(dados);
      setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu="perfil"]')) {
        setPerfilMenuAberto(false);
      }
      if (!target.closest('[data-menu="ranking"]')) {
        setRankingMenuAberto(false);
      }
      if (!target.closest('[data-menu="ganhos"]')) {
        setGanhosMenuAberto(false);
      }
      if (!target.closest('[data-menu="notificacoes"]')) {
        setNotificacoesMenuAberto(false);
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
      case 'Trimestral': return 'total';
      default: return 'semanal';
    }
  };

  // Carregar ranking do Firebase
  useEffect(() => {
    const carregarRanking = async () => {
      setCarregandoRanking(true);
      try {
        const periodo = mapearPeriodo(rankingPeriodo);
        const dados = await buscarRanking(periodo, 15);
        setRankingUsuarios(dados);

        if (user) {
          const stats = await buscarMinhasStats(user.uid, periodo);
          setMeuRanking({
            posicao: stats.posicao,
            atividades: stats.atividades
          });
        }
      } catch (error) {
        console.error("Erro ao carregar ranking:", error);
      } finally {
        setCarregandoRanking(false);
      }
    };
    carregarRanking();
  }, [rankingPeriodo, user]);

  // Carregar notificações
  useEffect(() => {
    const carregarNotificacoes = async () => {
      if (!user) return;
      setCarregandoNotificacoes(true);
      try {
        const dados = await buscarNotificacoes(user.uid);
        setNotificacoes(dados);
      } catch (error) {
        console.error("Erro ao carregar notificações:", error);
      } finally {
        setCarregandoNotificacoes(false);
      }
    };
    carregarNotificacoes();

    // Atualizar a cada 30 segundos
    const interval = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(interval);
  }, [user]);

  
  // Ícone customizado de 4 pontinhos coloridos
  const TodasIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="7" cy="7" r="3" fill="#3B82F6" />
      <circle cx="17" cy="7" r="3" fill="#10B981" />
      <circle cx="7" cy="17" r="3" fill="#F59E0B" />
      <circle cx="17" cy="17" r="3" fill="#EF4444" />
    </svg>
  );

  const materias = [
    { nome: "Todas", icon: TodasIcon, isTodas: true },
    { nome: "ENEM", icon: Books },
    { nome: "Matemática", icon: Calculator },
    { nome: "História", icon: Bank },
    { nome: "Geografia", icon: Globe },
    { nome: "Biologia", icon: Dna },
    { nome: "Português", icon: PencilLine },
    { nome: "Física", icon: Atom },
    { nome: "Química", icon: Flask },
    { nome: "Filosofia", icon: Brain },
    { nome: "Sociologia", icon: Users },
    { nome: "Administração", icon: Briefcase },
    { nome: "Pedagogia", icon: GraduationCap },
    { nome: "Inglês", icon: Translate },
    { nome: "Artes", icon: Palette },
    { nome: "Saúde", icon: FirstAidKit },
    { nome: "Ed. Física", icon: SoccerBall },
    { nome: "Contabilidade", icon: ChartLine },
    { nome: "Direito", icon: Scales },
    { nome: "Psicologia", icon: Brain },
    { nome: "Informática", icon: Desktop },
    { nome: "Lógica", icon: PuzzlePiece },
    { nome: "Ed. Moral", icon: Sparkle },
    { nome: "Espanhol", icon: Translate },
    { nome: "Música", icon: MusicNotes },
    { nome: "Ed. Técnica", icon: Wrench },
  ];

  // Matérias para o dropdown do modal
  const materiasModal = [
    "Matemática", "Português", "Física", "Química", "Biologia",
    "História", "Geografia", "Inglês", "Filosofia", "Sociologia",
    "Artes", "Ed. Física"
  ];

  // Símbolos por categoria (expandido)
  const categoriaSimbolosModal: Record<string, string[]> = {
    'Matemáticos': [
      '²', '³', '√', '∛', '·', '×', '÷', '±', '≈', '≠',
      '≤', '≥', '≡', '≅', '⇒', '⇔', '∈', '∉', '∧', '∨',
      '∞', '∴', '∵', '↔', '→', '←', '↑', '↓', '⇅', '⇄',
      '∫', '∑', '⊂', '⊃', '⊆', '⊇', '∀', '∃', '°', '∠',
      '∄', '⊥', '∪', '∩', '∅', '¬', '⊕', '∥', '∦', '∝'
    ],
    'Sobrescritos': [
      '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹',
      '⁺', '⁻', '⁼', '⁽', '⁾', 'ⁿ', 'ⁱ', '₀', '₁', '₂',
      '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋', '₌',
      '₍', '₎', 'ₐ', 'ₑ', 'ₒ', 'ₓ', 'ₕ', 'ₖ', 'ₗ', 'ₘ'
    ],
    'Gregos': [
      'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
      'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ',
      'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ',
      'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π',
      'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'
    ],
    'Setas': [
      '→', '←', '↑', '↓', '↔', '↕', '⇒', '⇐', '⇑', '⇓',
      '⇔', '⇕', '↗', '↘', '↙', '↖', '➔', '➜', '➡', '⬅',
      '⬆', '⬇', '↩', '↪', '⟵', '⟶', '⟷', '⟸', '⟹', '⟺'
    ],
    'Outros': [
      '©', '®', '™', '€', '£', '¥', '¢', '§', '¶', '†',
      '‡', '•', '…', '‰', '′', '″', '½', '¼', '¾', '⅓',
      '♠', '♣', '♥', '♦', '♪', '♫', '★', '☆', '✓', '✗'
    ],
  };
  const [categoriaSimboloAtiva, setCategoriaSimboloAtiva] = useState('Matemáticos');

  // Templates de equação para o modal
  const templatesEquacaoModal = [
    { icone: '↵', template: '\n', titulo: 'Nova linha' },
    { icone: '▢²', template: '▢²', titulo: 'Expoente' },
    { icone: '√▢', template: '√(▢)', titulo: 'Raiz quadrada' },
    { icone: '³√▢', template: '³√(▢)', titulo: 'Raiz cúbica' },
    { icone: '▢/▢', template: '(▢)/(▢)', titulo: 'Fração' },
    { icone: '▢ⁿ', template: '▢ⁿ', titulo: 'Sobrescrito' },
    { icone: '▢₁₂', template: '▢₁₂', titulo: 'Subscrito' },
    { icone: '≤', template: '≤', titulo: 'Menor ou igual' },
    { icone: '≥', template: '≥', titulo: 'Maior ou igual' },
    { icone: '≠', template: '≠', titulo: 'Diferente' },
    { icone: 'π', template: 'π', titulo: 'Pi' },
    { icone: 'α', template: 'α', titulo: 'Alfa' },
    { icone: 'β', template: 'β', titulo: 'Beta' },
    { icone: '{=', template: '{ ▢ = ▢\n{ ▢ = ▢', titulo: 'Sistema de equações' },
    { icone: '∫dx', template: '∫▢ dx', titulo: 'Integral' },
    { icone: 'lim', template: 'lim(x→▢) ▢', titulo: 'Limite' },
    { icone: '[⋮]', template: '[▢ ▢; ▢ ▢]', titulo: 'Matriz 2x2' },
    { icone: '∑', template: '∑(i=▢)^▢ ▢', titulo: 'Somatório' },
    { icone: '∞', template: '∞', titulo: 'Infinito' },
    { icone: '±', template: '±', titulo: 'Mais ou menos' },
  ];
  const [previewEquacao, setPreviewEquacao] = useState(false);
  const [arquivosAnexados, setArquivosAnexados] = useState<File[]>([]);

  // Estados das notificações
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [notificacoesMenuAberto, setNotificacoesMenuAberto] = useState(false);
  const [carregandoNotificacoes, setCarregandoNotificacoes] = useState(false);

  // Contador de notificações não lidas
  const notificacoesNaoLidas = notificacoes.filter(n => !n.lida).length;

  // Formatar tempo relativo para notificações
  const formatarTempoNotificacao = (timestamp: { toDate: () => Date }) => {
    const agora = new Date();
    const data = timestamp.toDate();
    const diffMs = agora.getTime() - data.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "agora";
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHoras < 24) return `${diffHoras}h`;
    if (diffDias < 7) return `${diffDias}d`;
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const inserirSimboloNaPergunta = (simbolo: string) => {
    setTextoPergunta(prev => prev + simbolo);
    setMostrarSimbolosModal(false);
  };

  const handleAnexarArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setArquivosAnexados(prev => [...prev, ...Array.from(files)]);
    }
    e.target.value = '';
  };

  const removerArquivo = (index: number) => {
    setArquivosAnexados(prev => prev.filter((_, i) => i !== index));
  };

  const [enviandoPergunta, setEnviandoPergunta] = useState(false);

  const handleEnviarPergunta = async () => {
    if (!textoPergunta.trim() || !materiaSelecionada) {
      toast.error("Preencha a pergunta e selecione a matéria");
      return;
    }
    if (!user) {
      toast.error("Você precisa estar logado para fazer uma pergunta");
      return;
    }
    if (valorSelecionado < 1) {
      toast.error("O valor deve ser pelo menos R$ 1,00");
      return;
    }

    setEnviandoPergunta(true);
    try {
      // Upload de arquivos anexados via Cloudinary
      let arquivosUrls: string[] = [];
      if (arquivosAnexados.length > 0) {
        arquivosUrls = await uploadArquivos(arquivosAnexados, `perguntas/${user.uid}`);
      }

      // Montar objeto da pergunta (sem campos undefined)
      const dadosPergunta: {
        materia: string;
        pergunta: string;
        valor: number;
        usuarioId: string;
        usuarioNome: string;
        status: 'aberta' | 'respondida' | 'fechada';
        usuarioFoto?: string;
        arquivos?: string[];
        nivel?: 'fundamental' | 'medio' | 'superior';
      } = {
        materia: materiaSelecionada,
        pergunta: textoPergunta,
        valor: valorSelecionado,
        usuarioId: user.uid,
        usuarioNome: user.displayName || "Usuário",
        status: 'aberta',
      };

      // Adicionar campos opcionais apenas se existirem
      if (user.photoURL) {
        dadosPergunta.usuarioFoto = user.photoURL;
      }
      if (arquivosUrls.length > 0) {
        dadosPergunta.arquivos = arquivosUrls;
      }
      if (nivelSelecionado) {
        dadosPergunta.nivel = nivelSelecionado as 'fundamental' | 'medio' | 'superior';
      }

      await criarPergunta(dadosPergunta);

      // Recarregar perguntas
      const dados = await buscarPerguntasComRespostas();
      setPerguntas(dados);

      // Resetar formulário
      setModalPerguntaAberto(false);
      setTextoPergunta("");
      setMateriaSelecionada("");
      setNivelSelecionado("");
      setValorSelecionado(10);
      setArquivosAnexados([]);
    } catch {
      toast.error("Erro ao enviar pergunta. Tente novamente.");
    } finally {
      setEnviandoPergunta(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header completo */}
      <header className="fixed top-0 left-0 right-0 z-50 py-4 border-b border-gray-100 px-6 flex justify-between items-center bg-white">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Questiongo" className="h-11 w-auto" />
          <span className="text-2xl text-gray-900" style={{ fontFamily: "'Figtree Black', sans-serif" }}>Questiongo</span>
          <span className="text-xs text-gray-400 ml-2">v2.1</span>
        </div>

        {/* Ações do header */}
        <div className="flex items-center gap-3">
          {/* Botão Faça sua pergunta */}
          <button
            onClick={() => setModalPerguntaAberto(true)}
            className="px-5 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-full hover:bg-blue-600 transition-colors cursor-pointer mr-3"
            style={{ fontSize: '15px', fontFamily: "'Figtree Bold', sans-serif" }}
          >
            FAÇA SUA PERGUNTA
          </button>

          {/* Ícone de Notificações / Correio */}
          <div className="relative" data-menu="notificacoes">
            <button
              onClick={() => setNotificacoesMenuAberto(!notificacoesMenuAberto)}
              className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
            >
              <Mail01Icon size={22} />
              {/* Badge de notificações não lidas */}
              {notificacoesNaoLidas > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {notificacoesNaoLidas > 9 ? '9+' : notificacoesNaoLidas}
                </span>
              )}
            </button>

            {/* Dropdown de Notificações */}
            {notificacoesMenuAberto && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-96 overflow-hidden">
                {/* Header do dropdown */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail01Icon size={20} />
                      <span className="font-bold">Caixa de Entrada</span>
                    </div>
                    {notificacoesNaoLidas > 0 && (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        {notificacoesNaoLidas} nova{notificacoesNaoLidas > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Lista de notificações */}
                <div className="max-h-96 overflow-y-auto">
                  {carregandoNotificacoes ? (
                    <div className="p-6 text-center text-gray-500">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Carregando...
                    </div>
                  ) : notificacoes.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Mail01Icon size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">Nenhuma notificação</p>
                      <p className="text-gray-400 text-sm mt-1">Quando alguém responder sua pergunta, você verá aqui!</p>
                    </div>
                  ) : (
                    notificacoes.slice(0, 5).map((notif, index) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          router.push(`/pergunta/${notif.perguntaId}`);
                          setNotificacoesMenuAberto(false);
                        }}
                        className={`px-4 py-3 cursor-pointer transition-all hover:bg-blue-50 border-b border-gray-100 last:border-b-0 ${
                          !notif.lida ? 'bg-blue-50/50' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Avatar do respondedor */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold overflow-hidden">
                              {notif.respondedorFoto ? (
                                <img src={notif.respondedorFoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                notif.respondedorNome.charAt(0)
                              )}
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {notif.respondedorNome}
                              </p>
                              <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                {formatarTempoNotificacao(notif.criadoEm)}
                              </span>
                            </div>

                            <p className="text-xs text-blue-600 font-medium mb-1">
                              respondeu sua pergunta
                            </p>

                            <p className="text-sm text-gray-600 line-clamp-2">
                              &ldquo;{notif.perguntaTexto.substring(0, 60)}{notif.perguntaTexto.length > 60 ? '...' : ''}&rdquo;
                            </p>

                            {/* Valor e status */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                R$ {notif.valor.toFixed(2)}
                              </span>
                              {!notif.lida ? (
                                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                  Aguardando avaliação
                                </span>
                              ) : (
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                  <CheckmarkCircle02Icon size={12} />
                                  Avaliada
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                {notificacoes.length > 5 && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <button
                      onClick={() => {
                        router.push('/minhas-perguntas');
                        setNotificacoesMenuAberto(false);
                      }}
                      className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Ver todas as perguntas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Foto de perfil com dropdown */}
          <div className="relative" data-menu="perfil">
            <button
              onClick={() => setPerfilMenuAberto(!perfilMenuAberto)}
              className="w-9 h-9 rounded-full bg-gray-300 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 transition-all"
            >
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
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
                  <button
                    onClick={() => {
                      setPerfilMenuAberto(false);
                      setModalFotoAberto(true);
                    }}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer w-full"
                  >
                    <Camera01Icon size={18} />
                    Alterar foto
                  </button>
                  <a
                    href="/configuracoes"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <Settings01Icon size={18}  />
                    Configurações
                  </a>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer w-full"
                  >
                    <Logout01Icon size={18}  />
                    Sair da conta
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Container com sidebar e conteúdo */}
      <div className="flex pt-16">
        {/* Menu lateral esquerdo */}
        <div className="w-64 bg-white min-h-screen border-r border-gray-100 p-4 flex flex-col fixed top-16 left-0 bottom-0">
          {/* Menu principal */}
          <nav className="space-y-1 flex-1 mt-4">
            <a href="/home" className="flex items-center gap-3 px-4 py-2.5 text-gray-800 bg-gray-200 rounded-full cursor-pointer" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
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
        <div className="flex-1 ml-64">
          {/* Filtro de matérias */}
          <div className="py-4 border-b border-gray-100">
            <div className="flex justify-center items-center gap-2">
            {materias.map((materia: any) => {
              const IconComponent = materia.icon;
              const isSelected = materia.isTodas ? !materiaFiltro : materiaFiltro === materia.nome;
              return (
                <div key={materia.nome} className="relative group">
                  <button
                    onClick={() => setMateriaFiltro(materia.isTodas ? null : (materiaFiltro === materia.nome ? null : materia.nome))}
                    className={`cursor-pointer hover:scale-110 transition-all p-2 rounded-full ${
                      isSelected
                        ? 'bg-gray-200 text-gray-800'
                        : materiaFiltro && !materia.isTodas ? 'opacity-40 text-gray-500' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {materia.isTodas ? (
                      <IconComponent size={24} />
                    ) : (
                      <IconComponent size={24} weight="fill" />
                    )}
                  </button>
                  {/* Tooltip chatbox */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    <span className="text-sm font-medium text-gray-800">{materia.nome}</span>
                    {/* Seta do balão */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white"></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-200 translate-y-px"></div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>

          {/* Área de conteúdo */}
          <div className="p-6 flex justify-between">
          {/* Mercado - Perguntas */}
          <div className="flex-1 mr-6">
            {/* Header com título e filtros */}
            <div className="mb-6">
              <h1 className="mb-2" style={{ fontFamily: "'Figtree Black', sans-serif", color: '#0F1A45', fontSize: '53px' }}>
                Respostas para
              </h1>
              <h2 className="mb-6" style={{ fontFamily: "'Figtree Black', sans-serif", color: '#0F1A45', fontSize: '53px' }}>
                qualquer disciplina
              </h2>
              <button
                onClick={() => setModalPerguntaAberto(true)}
                className="px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer text-sm"
                style={{ fontFamily: "'Figtree Bold', sans-serif" }}
              >
                FAÇA SUA PERGUNTA
              </button>
            </div>

            {/* Linha divisora */}
            <div className="border-b border-gray-200 mb-6"></div>

            {/* Filtros de nível e resposta */}
            <div className="flex gap-3 mb-6">
              <div className="relative">
                <select
                  value={nivelFiltro}
                  onChange={(e) => setNivelFiltro(e.target.value)}
                  className="appearance-none bg-gray-100 text-gray-700 font-medium px-6 py-3 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF4F00] cursor-pointer"
                  style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                >
                  <option value="todos">Todos os níveis</option>
                  <option value="fundamental">Ensino fundamental (básico)</option>
                  <option value="medio">Ensino médio (secundário)</option>
                  <option value="superior">Ensino superior</option>
                </select>
                <ArrowDown01Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
              </div>

              <div className="relative">
                <select
                  value={statusFiltro}
                  onChange={(e) => setStatusFiltro(e.target.value)}
                  className="appearance-none bg-gray-100 text-gray-700 font-medium px-6 py-3 pr-10 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FF4F00] cursor-pointer"
                  style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                >
                  <option value="sem_resposta">Sem Resposta</option>
                  <option value="todas">Todas</option>
                  <option value="pendentes">Pendentes</option>
                  <option value="respondidas">Respondidas</option>
                </select>
                <ArrowDown01Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={20} />
              </div>
            </div>

            <div>
              {carregando ? (
                <div className="p-8 text-center text-gray-500">
                  Carregando perguntas...
                </div>
              ) : (() => {
                const perguntasFiltradas = perguntas.filter(p => {
                  // Filtro de matéria
                  if (materiaFiltro && p.materia !== materiaFiltro) return false;

                  // Filtro de nível
                  if (nivelFiltro !== 'todos' && p.nivel !== nivelFiltro) return false;

                  // Filtro de status/resposta
                  if (statusFiltro === 'sem_resposta' && p.status !== 'aberta') return false;
                  if (statusFiltro === 'respondidas' && p.status !== 'respondida') return false;
                  if (statusFiltro === 'pendentes' && p.status !== 'aberta') return false;

                  return true;
                });

                // Ordenar: abertas primeiro, depois respondidas (por data decrescente em cada grupo)
                const perguntasOrdenadas = [...perguntasFiltradas].sort((a, b) => {
                  // Prioridade: aberta > respondida > fechada
                  const prioridade = { 'aberta': 0, 'respondida': 1, 'fechada': 2 };
                  const prioA = prioridade[a.status] ?? 2;
                  const prioB = prioridade[b.status] ?? 2;

                  if (prioA !== prioB) return prioA - prioB;

                  // Mesmo status: ordenar por data (mais recente primeiro)
                  const dataA = a.criadoEm?.toDate?.() || new Date(0);
                  const dataB = b.criadoEm?.toDate?.() || new Date(0);
                  return dataB.getTime() - dataA.getTime();
                });

                return perguntasOrdenadas.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {materiaFiltro
                      ? `Nenhuma pergunta de ${materiaFiltro} ainda.`
                      : 'Nenhuma pergunta ainda. Seja o primeiro a fazer uma pergunta!'
                    }
                  </div>
                ) : (
                  perguntasOrdenadas.map((item, index) => (
                    <div key={item.id} className={`py-4 relative ${index !== perguntasOrdenadas.length - 1 ? 'border-b border-gray-200' : ''}`}>
                      <div className="px-4">
                    {/* Pill de valor ou selo de verificado no canto superior direito */}
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      {/* Selo de verificado OU valor */}
                      {item.status === 'respondida' && item.respostaVerificada === true ? (
                        <span className="flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full bg-[#00A86B]/50">
                          <SealCheck size={18} weight="fill" className="text-[#00C853]" />
                          <span className="text-gray-900">Verificada</span>
                        </span>
                      ) : item.status === 'respondida' && item.respostaVerificada === false ? (
                        <span className="flex items-center gap-2 text-sm font-bold px-3 py-1.5 rounded-full bg-red-100">
                          <SealWarning size={18} weight="fill" className="text-red-500" />
                          <span className="text-red-700">Possivelmente incorreta</span>
                        </span>
                      ) : item.status !== 'respondida' ? (
                        <span className="bg-gray-100 text-gray-700 text-sm font-bold px-4 py-1.5 rounded-full">
                          R$ {item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      ) : null}
                    </div>

                    {/* Cabeçalho: Foto + Matéria + Tempo */}
                    <div className="flex items-start gap-3">
                      {/* Foto de perfil */}
                      <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0 mt-0.5">
                        {item.usuarioFoto ? (
                          <img src={item.usuarioFoto} alt={item.usuarioNome} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                            {item.usuarioNome?.charAt(0) || "?"}
                          </div>
                        )}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 pr-20">
                        {/* Matéria e Tempo */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-gray-800">{item.materia}</span>
                          {item.status === 'respondida' && (
                            <>
                              <span className="text-sm text-gray-400 font-bold">•</span>
                              <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                Respondida
                              </span>
                            </>
                          )}
                          <span className="text-sm text-gray-400 font-bold">•</span>
                          <span className="text-sm font-bold text-gray-400">{formatarTempoRelativo(item.criadoEm)}</span>


                        </div>

                        {/* Pergunta - abre página completa */}
                        <p
                          onClick={() => router.push(`/pergunta/${item.id}`)}
                          className="mb-3 cursor-pointer hover:text-blue-600 transition-colors text-lg"
                          style={{ fontSize: '18px', color: '#000000' }}
                        >
                          {item.pergunta}
                        </p>

                        {/* Foto do respondedor (se respondida) */}
                        {item.status === 'respondida' && item.respondedorNome && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 overflow-hidden flex-shrink-0">
                              {item.respondedorFoto ? (
                                <img src={item.respondedorFoto} alt={item.respondedorNome} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                  {item.respondedorNome?.charAt(0) || "?"}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-gray-600">
                              Respondida por <span className="font-semibold text-gray-800">{item.respondedorNome}</span>
                            </span>
                          </div>
                        )}

                        {/* Indicador de anexos */}
                        {item.arquivos && item.arquivos.length > 0 && (
                          <div className="flex items-center gap-1 text-blue-500 text-sm mb-4">
                            <Attachment01Icon size={14} />
                            <span className="text-xs font-medium">
                              {item.arquivos.length} {item.arquivos.length === 1 ? 'anexo' : 'anexos'}
                            </span>
                          </div>
                        )}

                        {/* Rodapé: Botões */}
                        <div className="flex items-center justify-end gap-2 -mr-20">
                          {/* 3 pontinhos */}
                          <div className="relative ml-auto">
                            <button
                              onClick={() => setMenuAberto(menuAberto === item.id ? null : item.id || null)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                              style={{ color: '#000000' }}
                            >
                              <MoreVerticalIcon size={20} strokeWidth={2.5} />
                            </button>

                            {/* Menu de denúncia */}
                            {menuAberto === item.id && (
                              <div className="absolute bottom-full right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                                <button
                                  onClick={async () => {
                                    if (!user || !item.id) return;
                                    try {
                                      await criarDenuncia({
                                        perguntaId: item.id,
                                        denuncianteId: user.uid,
                                        denuncianteNome: user.displayName || 'Usuário',
                                      });
                                      toast.success("Denúncia enviada! Vamos analisar.");
                                    } catch {
                                      toast.error("Erro ao enviar denúncia. Tente novamente.");
                                    }
                                    setMenuAberto(null);
                                  }}
                                  className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
                                >
                                  Denunciar
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Botão Responder */}
                          <button
                            onClick={() => router.push(`/responder/${item.id}`)}
                            className="px-4 py-2 bg-white rounded-full border-2 border-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
                            style={{ fontFamily: "'Figtree Bold', sans-serif", fontSize: '12px', color: '#000000', fontWeight: 700 }}
                          >
                            RESPONDER
                          </button>
                        </div>
                      </div>
                    </div>
                      </div>
                  </div>
                  ))
                );
              })()}
            </div>
          </div>

          {/* Revenue e Ranking */}
          <div className="flex flex-col gap-4">
            {/* Card de Ganhos */}
            <div className="border border-gray-200 rounded-xl p-6 w-[500px]">
              <div className="flex items-center gap-2 mb-4">
                <MoneyBag02Icon size={24} className="text-green-500" />
                <h3 className="text-lg text-gray-800" style={{ fontFamily: "'Figtree Bold', sans-serif" }}>Seus Ganhos</h3>
              </div>

              {/* Filtro de período */}
              <div className="relative mb-4" data-menu="ganhos">
                <button
                  onClick={() => setGanhosMenuAberto(!ganhosMenuAberto)}
                  className="flex items-center justify-between gap-4 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-full cursor-pointer hover:bg-gray-200 transition-colors w-full"
                  style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                >
                  {ganhosPeriodo}
                  <ArrowDown01Icon size={16} />
                </button>

                {ganhosMenuAberto && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 w-full">
                    {["Últimos 7 dias", "Últimos 30 dias", "Todo o período"].map((periodo) => (
                      <button
                        key={periodo}
                        onClick={() => {
                          setGanhosPeriodo(periodo);
                          setGanhosMenuAberto(false);
                        }}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                        style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                      >
                        {periodo}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Total Ganho */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5">
                  <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>Total Ganho</p>
                  <p className="text-green-600" style={{ fontSize: '48px', fontFamily: "'Figtree Black', sans-serif", fontWeight: 900 }}>
                    R$ {(saldo?.totalGanho || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Saldo Disponível */}
                <div className="bg-gray-50 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>Saldo Disponível</p>
                    <p className="text-gray-800" style={{ fontSize: '36px', fontFamily: "'Figtree Black', sans-serif", fontWeight: 900 }}>
                      R$ {(saldo?.saldoDisponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/carteira')}
                    className="px-4 py-2 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition-colors cursor-pointer"
                    style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}
                  >
                    Sacar
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-6 w-[500px]">
              {/* Título com coroa */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CrownIcon size={24}  className="text-yellow-500" />
                  <h3 className="text-lg font-bold text-gray-800">Melhores usuários</h3>
                </div>
                <a href="/ranking" className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>
                  Ver todos
                </a>
              </div>

              {/* Pill de período */}
              <div className="relative mb-4" data-menu="ranking">
                <button
                  onClick={() => setRankingMenuAberto(!rankingMenuAberto)}
                  className="flex items-center justify-between gap-4 bg-gray-100 text-gray-700 text-sm font-medium px-8 py-3 rounded-full cursor-pointer hover:bg-gray-200 transition-colors w-full"
                >
                  {rankingPeriodo}
                  <ArrowDown01Icon size={16}  />
                </button>

                {rankingMenuAberto && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                    {["Diário", "Semanal", "Mensal", "Trimestral"].map((periodo) => (
                      <button
                        key={periodo}
                        onClick={() => {
                          setRankingPeriodo(periodo);
                          setRankingMenuAberto(false);
                        }}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                      >
                        {periodo}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de usuários */}
              <div className="space-y-3">
                {carregandoRanking ? (
                  <div className="text-center text-gray-500 py-4">Carregando...</div>
                ) : rankingUsuarios.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">Nenhuma atividade ainda</div>
                ) : (
                  rankingUsuarios.slice(0, rankingExpandido ? 15 : 5).map((usuario, index) => {
                    // Obter atividades baseado no período selecionado
                    const getAtividades = () => {
                      switch (rankingPeriodo) {
                        case 'Diário': return usuario.atividadesHoje;
                        case 'Semanal': return usuario.atividadesSemana;
                        case 'Mensal': return usuario.atividadesMes;
                        default: return usuario.atividadesTotal;
                      }
                    };

                    const isCurrentUser = user && usuario.usuarioId === user.uid;

                    return (
                      <div key={usuario.usuarioId} className={`flex items-center gap-3 ${isCurrentUser ? 'bg-blue-50 rounded-full px-3 py-2 -mx-3' : ''}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                          {usuario.usuarioFoto ? (
                            <img src={usuario.usuarioFoto} alt={usuario.usuarioNome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                              {usuario.usuarioNome?.charAt(0) || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isCurrentUser ? 'text-blue-700' : 'text-gray-800'}`}>{isCurrentUser ? 'Você' : usuario.usuarioNome}</p>
                        </div>
                        <span className={`text-sm ${isCurrentUser ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>{getAtividades()} atividades</span>
                      </div>
                    );
                  })
                )}

                {/* Meu Ranking - só mostrar se fora da lista visível */}
                {user && meuRanking.posicao > (rankingExpandido ? 15 : 5) && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-full px-3 py-2 -mx-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="Você" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {user?.displayName?.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-700">Você • #{meuRanking.posicao || '-'}</p>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">{meuRanking.atividades} atividades</span>
                </div>
                )}

                {/* Botão mostrar mais/menos */}
                {!carregandoRanking && (
                  <button
                    onClick={() => setRankingExpandido(!rankingExpandido)}
                    className="w-full text-center text-sm hover:opacity-70 cursor-pointer py-2"
                    style={{ fontFamily: "'Figtree Medium', sans-serif", color: '#000000' }}
                  >
                    {rankingExpandido ? 'MOSTRAR MENOS' : 'MOSTRAR MAIS'}
                  </button>
                )}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Modal Tire sua dúvida escolar */}
      {modalPerguntaAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-visible">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: "'Figtree Bold', sans-serif" }}>
                Tire sua dúvida escolar
              </h3>
              <button
                onClick={() => setModalPerguntaAberto(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              {/* Textarea */}
              <textarea
                value={textoPergunta}
                onChange={(e) => setTextoPergunta(e.target.value)}
                placeholder="Escreva sua pergunta aqui. (Para conseguir uma ótima resposta, descreva sua dúvida de forma simples e clara)"
                className="w-full h-44 p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF4F00] focus:border-transparent text-gray-900 placeholder-gray-400"
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              />

              {/* Preview de arquivos anexados */}
              {arquivosAnexados.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {arquivosAnexados.map((arquivo, index) => (
                    <div key={index} className="relative group">
                      {arquivo.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(arquivo)}
                          alt={arquivo.name}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500 text-center px-1 truncate">{arquivo.name.split('.').pop()?.toUpperCase()}</span>
                        </div>
                      )}
                      <button
                        onClick={() => removerArquivo(index)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-2 mt-3">
                {/* Botão equação */}
                <button
                  onClick={() => setMostrarEquacaoModal(true)}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none"
                  title="Inserir equação"
                >
                  √x
                </button>

                {/* Botão símbolos */}
                <button
                  onClick={() => setMostrarSimbolosModal(true)}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none"
                  title="Símbolos"
                >
                  Ω
                </button>

                {/* Botão anexar */}
                <button
                  onClick={() => document.getElementById('anexoPergunta')?.click()}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none"
                  title="Anexar arquivo"
                >
                  <Attachment01Icon size={20} />
                </button>
                <input
                  id="anexoPergunta"
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAnexarArquivo}
                />



              </div>

              {/* Dropdowns e info */}
              <div className="flex items-center gap-3 mt-4">
                {/* Dropdown Matéria */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setMateriaMenuAberto(!materiaMenuAberto)}
                    className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                  >
                    <span className={materiaSelecionada ? 'text-gray-800' : 'text-gray-500'}>
                      {materiaSelecionada || 'Escolha a matéria'}
                    </span>
                    <ArrowDown01Icon size={16} />
                  </button>

                  {materiaMenuAberto && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-[100] w-full max-h-60 overflow-y-auto">
                      {materiasModal.map((materia) => (
                        <button
                          key={materia}
                          onClick={() => {
                            setMateriaSelecionada(materia);
                            setMateriaMenuAberto(false);
                          }}
                          className="px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 w-full text-left cursor-pointer transition-colors"
                          style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                        >
                          {materia}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown Nível */}
                <div className="relative">
                  <select
                    value={nivelSelecionado}
                    onChange={(e) => setNivelSelecionado(e.target.value)}
                    className="appearance-none bg-gray-100 text-gray-700 px-4 py-2.5 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F00] cursor-pointer"
                    style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                  >
                    <option value="">Nível</option>
                    <option value="fundamental">Fundamental</option>
                    <option value="medio">Médio</option>
                    <option value="superior">Superior</option>
                  </select>
                  <ArrowDown01Icon className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                </div>

                {/* Input Valor */}
                <div className="relative flex items-center bg-gray-100 rounded-lg px-3 py-2.5">
                  <span className="text-gray-500 mr-1" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>R$</span>
                  <input
                    type="number"
                    min="1"
                    value={valorSelecionado || ""}
                    onChange={(e) => setValorSelecionado(e.target.value === "" ? 0 : Number(e.target.value))}
                    className="w-16 bg-transparent text-gray-700 focus:outline-none text-center"
                    style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                  />
                </div>

                {/* Info saldo */}
                <div className="flex items-center gap-1.5 text-gray-500">
                  <InformationCircleIcon size={18} />
                  <span className="text-sm" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>
                    Seu saldo: R$ {(saldo?.saldoDisponivel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Botão enviar */}
              <button
                onClick={handleEnviarPergunta}
                disabled={!textoPergunta.trim() || !materiaSelecionada || enviandoPergunta}
                className="w-full mt-6 px-6 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Figtree Bold', sans-serif" }}
              >
                {enviandoPergunta ? 'ENVIANDO...' : 'FAÇA SUA PERGUNTA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Símbolos */}
      {mostrarSimbolosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: "'Figtree Bold', sans-serif" }}>
                Símbolos
              </h3>
              <button
                onClick={() => setMostrarSimbolosModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            {/* Categorias */}
            <div className="px-6 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {Object.keys(categoriaSimbolosModal).map((categoria) => (
                  <button
                    key={categoria}
                    onClick={() => setCategoriaSimboloAtiva(categoria)}
                    className={`px-4 py-2 text-sm rounded-full transition-colors cursor-pointer focus:outline-none ${
                      categoriaSimboloAtiva === categoria
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                    style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid de símbolos */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-10 gap-2">
                {categoriaSimbolosModal[categoriaSimboloAtiva]?.map((simbolo, idx) => (
                  <button
                    key={idx}
                    onClick={() => inserirSimboloNaPergunta(simbolo)}
                    className="w-10 h-10 flex items-center justify-center text-lg bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-colors cursor-pointer focus:outline-none"
                  >
                    {simbolo}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setMostrarSimbolosModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer focus:outline-none"
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editor de Equações */}
      {mostrarEquacaoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: "'Figtree Bold', sans-serif" }}>
                Editor de Equações
              </h3>
              <button
                onClick={() => setPreviewEquacao(!previewEquacao)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${previewEquacao ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              >
                {previewEquacao ? 'Editar' : 'Visualizar'}
              </button>
            </div>

            {/* Templates de equação */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {templatesEquacaoModal.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setEquacaoModal(prev => prev + t.template)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer focus:outline-none group"
                    title={t.titulo}
                  >
                    <span className="text-gray-700 group-hover:text-blue-600" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>
                      {t.icone}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Área de edição/preview */}
            <div className="p-6">
              {previewEquacao ? (
                <div
                  className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg whitespace-pre-wrap"
                  style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                >
                  {equacaoModal || <span className="text-gray-400">Nenhuma equação digitada</span>}
                </div>
              ) : (
                <textarea
                  value={equacaoModal}
                  onChange={(e) => setEquacaoModal(e.target.value)}
                  placeholder="Digite uma equação... Ex: x² + 2x + 1 = 0"
                  className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF4F00] focus:border-transparent text-gray-900 placeholder-gray-400 text-lg"
                  style={{ fontFamily: "'Figtree Medium', sans-serif" }}
                  autoFocus
                />
              )}
            </div>

            {/* Footer com botões */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setEquacaoModal('');
                  setMostrarEquacaoModal(false);
                  setPreviewEquacao(false);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer focus:outline-none"
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              >
                CANCELAR
              </button>
              <button
                onClick={() => {
                  if (equacaoModal.trim()) {
                    setTextoPergunta(prev => prev + ' ' + equacaoModal + ' ');
                    setEquacaoModal('');
                    setMostrarEquacaoModal(false);
                    setPreviewEquacao(false);
                  }
                }}
                disabled={!equacaoModal.trim()}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}
              >
                INSERIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Visualizar Pergunta */}
      {perguntaSelecionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden flex-shrink-0">
                  {perguntaSelecionada.usuarioFoto ? (
                    <img src={perguntaSelecionada.usuarioFoto} alt={perguntaSelecionada.usuarioNome} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {perguntaSelecionada.usuarioNome?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{perguntaSelecionada.usuarioNome}</p>
                  <p className="text-sm text-gray-500">{perguntaSelecionada.materia} • {formatarTempoRelativo(perguntaSelecionada.criadoEm)}</p>
                </div>
              </div>
              <button
                onClick={() => setPerguntaSelecionada(null)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Valor */}
              <div className="mb-4">
                <span className="bg-green-100 text-green-700 text-sm font-bold px-4 py-1.5 rounded-full">
                  R$ {perguntaSelecionada.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </span>
              </div>

              {/* Pergunta */}
              <p className="text-gray-800 text-lg mb-4" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>
                {perguntaSelecionada.pergunta}
              </p>

              {/* Imagens anexadas */}
              {perguntaSelecionada.arquivos && perguntaSelecionada.arquivos.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2 font-medium">Anexos:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {perguntaSelecionada.arquivos.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}



            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setPerguntaSelecionada(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer focus:outline-none"
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  router.push(`/responder/${perguntaSelecionada.id}`);
                  setPerguntaSelecionada(null);
                }}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer focus:outline-none"
                style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}
              >
                Responder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de alteração de foto */}
      {modalFotoAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg text-gray-800" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
                Alterar foto de perfil
              </h2>
              <button
                onClick={() => {
                  setModalFotoAberto(false);
                  setArquivoFoto(null);
                  setPreviewFoto(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <Cancel01Icon size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6">
              {/* Preview da foto */}
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-gray-100">
                  {previewFoto ? (
                    <img src={previewFoto} alt="Preview" className="w-full h-full object-cover" />
                  ) : user?.photoURL ? (
                    <img src={user.photoURL} alt="Foto atual" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
              </div>

              {/* Input de arquivo */}
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSelecionarFoto}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <Camera01Icon size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-600" style={{ fontFamily: "'Figtree Medium', sans-serif" }}>
                    {arquivoFoto ? arquivoFoto.name : 'Selecionar imagem'}
                  </span>
                </div>
              </label>

              <p className="text-xs text-gray-500 text-center mt-2">
                Formatos aceitos: JPG, PNG, GIF, WEBP. Tamanho máximo: 5MB
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setModalFotoAberto(false);
                  setArquivoFoto(null);
                  setPreviewFoto(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                style={{ fontFamily: "'Figtree Medium', sans-serif" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAtualizarFoto}
                disabled={!arquivoFoto || uploadingFoto}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}
              >
                {uploadingFoto ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Premium */}
      <FooterPremium />

      {/* Espaço para o rodapé fixo */}
      <div className="h-16" />
    </div>
  );
}
