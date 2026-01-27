"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft01Icon, HelpCircleIcon, Attachment01Icon } from "hugeicons-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, buscarPerguntaPorId, Pergunta, criarResposta, uploadArquivos } from "@/lib/firebase";
import toast from "react-hot-toast";

const categoriaSimbolos: Record<string, string[]> = {
  'Matemáticos': [
    '²', '³', '√', '∛', '·', '×', '÷', '±', '≈', '≠',
    '≤', '≥', '≡', '≅', '⇒', ',', '⇔', '∈', '∉', '∧',
    '∨', '∞', 'α', 'β', 'Δ', 'π', 'Φ', 'ω', '↑', '↓',
    '∴', '∵', '↔', '→', '←', '⇅', '⇈', '⇄', '⊆', '∫',
    '∑', '⊂', '⊃', '⊆', '⊇', '∉', '∌', '∀', '°', '∠',
    '∄', '⊥', '∪', '∩', '∅', '¬', '⊕', '∥', '∦', '∝',
    'log', 'ln'
  ],
  'Sobrescritos': [
    '⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹',
    '⁺', '⁻', '⁼', '⁽', '⁾', 'ⁿ', 'ⁱ', '₀', '₁', '₂',
    '₃', '₄', '₅', '₆', '₇', '₈', '₉', '₊', '₋', '₌',
    '₍', '₎', 'ₐ', 'ₑ', 'ₒ', 'ₓ', 'ₕ', 'ₖ', 'ₗ', 'ₘ',
    'ₙ', 'ₚ', 'ₛ', 'ₜ'
  ],
  'Gregos': [
    'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ',
    'λ', 'μ', 'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ',
    'φ', 'χ', 'ψ', 'ω', 'Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ',
    'Η', 'Θ', 'Ι', 'Κ', 'Λ', 'Μ', 'Ν', 'Ξ', 'Ο', 'Π',
    'Ρ', 'Σ', 'Τ', 'Υ', 'Φ', 'Χ', 'Ψ', 'Ω'
  ],
  'Cirílico': [
    'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'Й',
    'К', 'Л', 'М', 'Н', 'О', 'П', 'Р', 'С', 'Т', 'У',
    'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э',
    'Ю', 'Я', 'а', 'б', 'в', 'г', 'д', 'е', 'ж', 'з',
    'и', 'й', 'к', 'л', 'м', 'н', 'о', 'п', 'р', 'с'
  ],
  'Europeus': [
    'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É',
    'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï', 'Ð', 'Ñ', 'Ò', 'Ó',
    'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Þ',
    'ß', 'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è',
    'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï', 'ð', 'ñ', 'ò'
  ],
  'Outros': [
    '©', '®', '™', '€', '£', '¥', '¢', '§', '¶', '†',
    '‡', '•', '…', '‰', '′', '″', '‹', '›', '«', '»',
    '—', '–', '♠', '♣', '♥', '♦', '♪', '♫', '★', '☆',
    '☀', '☁', '☂', '☃', '✓', '✗', '✔', '✘', '➔', '➜'
  ]
};

export default function ResponderPergunta() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [campoAtivo, setCampoAtivo] = useState<'resposta' | 'explicacao'>('explicacao');
  const [mostrarSimbolos, setMostrarSimbolos] = useState(false);
  const [categoriaAtiva, setCategoriaAtiva] = useState('Matemáticos');
  const [mostrarEditorEquacao, setMostrarEditorEquacao] = useState(false);
  const [equacao, setEquacao] = useState('');
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [arquivosAnexados, setArquivosAnexados] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const respostaRef = useRef<HTMLDivElement>(null);
  const explicacaoRef = useRef<HTMLDivElement>(null);
  const equacaoInputRef = useRef<HTMLTextAreaElement>(null);

  // Verificar autenticação
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

  // Buscar pergunta do Firestore
  useEffect(() => {
    const carregarPergunta = async () => {
      try {
        const dados = await buscarPerguntaPorId(id);
        setPergunta(dados);
      } catch (error) {
        console.error("Erro ao carregar pergunta:", error);
      } finally {
        setCarregando(false);
      }
    };
    if (id) {
      carregarPergunta();
    }
  }, [id]);

  const handleAnexar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const novosArquivos = Array.from(files);
      setArquivosAnexados(prev => [...prev, ...novosArquivos]);
    }
    e.target.value = '';
  };

  const removerArquivo = (index: number) => {
    setArquivosAnexados(prev => prev.filter((_, i) => i !== index));
  };

  const getConteudo = (ref: React.RefObject<HTMLDivElement | null>) => {
    return ref.current?.innerHTML || "";
  };

  const getTextoPlano = (ref: React.RefObject<HTMLDivElement | null>) => {
    return ref.current?.innerText || "";
  };

  const handleEnviar = async () => {
    const respostaTexto = getTextoPlano(respostaRef);
    const explicacaoTexto = getTextoPlano(explicacaoRef);

    if (!respostaTexto.trim() || !explicacaoTexto.trim()) {
      toast.error("Preencha a resposta e a explicação");
      return;
    }

    if (!user || !pergunta) {
      toast.error("Usuário não autenticado ou pergunta não encontrada");
      return;
    }

    setEnviando(true);

    try {
      // Upload de arquivos anexados
      let arquivosUrls: string[] = [];
      if (arquivosAnexados.length > 0) {
        arquivosUrls = await uploadArquivos(arquivosAnexados, `respostas/${user.uid}`);
      }

      // Montar objeto da resposta (sem campos undefined)
      const dadosResposta: {
        perguntaId: string;
        resposta: string;
        explicacao: string;
        usuarioId: string;
        usuarioNome: string;
        status: 'pendente' | 'aceita' | 'rejeitada';
        perguntaMateria?: string;
        perguntaTexto?: string;
        perguntaValor?: number;
        arquivos?: string[];
        usuarioFoto?: string;
      } = {
        perguntaId: id,
        resposta: respostaTexto,
        explicacao: explicacaoTexto,
        usuarioId: user.uid,
        usuarioNome: user.displayName || "Usuário",
        status: 'pendente',
        perguntaMateria: pergunta.materia,
        perguntaTexto: pergunta.pergunta,
        perguntaValor: pergunta.valor,
      };

      // Adicionar campos opcionais apenas se existirem
      if (arquivosUrls.length > 0) {
        dadosResposta.arquivos = arquivosUrls;
      }
      if (user.photoURL) {
        dadosResposta.usuarioFoto = user.photoURL;
      }

      await criarResposta(dadosResposta);

      toast.success("Resposta enviada com sucesso!");
      router.push("/minhas-respostas");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao enviar resposta: ${errorMessage}`);
    } finally {
      setEnviando(false);
    }
  };

  const aplicarFormatacao = useCallback((comando: string, valor?: string) => {
    const editorAtivo = campoAtivo === 'resposta' ? respostaRef.current : explicacaoRef.current;
    if (editorAtivo) {
      editorAtivo.focus();
    }
    document.execCommand(comando, false, valor);
  }, [campoAtivo]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Carregando pergunta...</p>
      </div>
    );
  }

  if (!pergunta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Pergunta não encontrada</p>
      </div>
    );
  }

  const inserirFormatacao = (tipo: string) => {
    switch (tipo) {
      case 'bold':
        aplicarFormatacao('bold');
        break;
      case 'italic':
        aplicarFormatacao('italic');
        break;
      case 'underline':
        aplicarFormatacao('underline');
        break;
      case 'h1':
        aplicarFormatacao('formatBlock', 'h1');
        break;
      case 'h2':
        aplicarFormatacao('formatBlock', 'h2');
        break;
      case 'ul':
        aplicarFormatacao('insertUnorderedList');
        break;
      case 'ol':
        aplicarFormatacao('insertOrderedList');
        break;
      case 'math':
        setMostrarEditorEquacao(true);
        break;
      case 'symbols':
        setMostrarSimbolos(!mostrarSimbolos);
        break;
    }
  };

  const inserirSimbolo = (simbolo: string) => {
    const editorAtivo = campoAtivo === 'resposta' ? respostaRef.current : explicacaoRef.current;
    if (editorAtivo) {
      editorAtivo.focus();
    }
    document.execCommand('insertText', false, simbolo);
    setMostrarSimbolos(false);
  };

  // Funções do Editor de Equações
  const inserirTemplateEquacao = (template: string) => {
    const textarea = equacaoInputRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const antes = equacao.substring(0, start);
    const depois = equacao.substring(end);

    setEquacao(antes + template + depois);

    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      const cursorPos = start + template.indexOf('▢');
      if (cursorPos >= start) {
        textarea.setSelectionRange(cursorPos, cursorPos + 1);
      } else {
        textarea.setSelectionRange(start + template.length, start + template.length);
      }
    }, 0);
  };

  const inserirEquacaoNoEditor = () => {
    if (!equacao.trim()) return;

    const editorAtivo = campoAtivo === 'resposta' ? respostaRef.current : explicacaoRef.current;
    if (editorAtivo) {
      editorAtivo.focus();
    }

    // Inserir a equação formatada
    document.execCommand('insertText', false, ` ${equacao} `);

    // Limpar e fechar
    setEquacao('');
    setMostrarEditorEquacao(false);
    setMostrarPreview(false);
  };

  const cancelarEquacao = () => {
    setEquacao('');
    setMostrarEditorEquacao(false);
    setMostrarPreview(false);
  };

  // Templates de equação
  const templatesEquacao = [
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft01Icon size={24} />
            </button>
            <img src="/logo.svg" alt="Questiongo" className="h-10 w-auto" />
          </div>

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              <span className="text-sm" style={{ fontFamily: 'var(--font-medium)' }}>Como dar uma boa resposta</span>
              <HelpCircleIcon size={18} />
            </button>
            <button
              onClick={handleEnviar}
              disabled={enviando}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-semibold)' }}
            >
              {enviando ? "Enviando..." : "RESPONDER"}
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="grid grid-cols-2 gap-8 h-full">
          {/* Lado esquerdo - Tarefa */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full" style={{ fontFamily: 'var(--font-semibold)' }}>
                {pergunta.materia}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full" style={{ fontFamily: 'var(--font-bold)' }}>
                R$ {pergunta.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>

            <h2 className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
              TAREFA
            </h2>

            <p className="text-gray-800 text-lg leading-relaxed" style={{ fontFamily: 'var(--font-medium)' }}>
              {pergunta.pergunta}
            </p>

            {/* Imagens anexadas */}
            {pergunta.arquivos && pergunta.arquivos.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>Anexos:</p>
                <div className="grid grid-cols-2 gap-2">
                  {pergunta.arquivos.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={url}
                        alt={`Anexo ${idx + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-medium)' }}>
                Entregar até: <span className="text-gray-700">{pergunta.dataEntrega}</span>
              </p>
            </div>
          </div>

          {/* Lado direito - Editor de resposta */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col">
            {/* Campo Resposta */}
            <div className="mb-6">
              <label className="text-sm text-gray-500 mb-2 block" style={{ fontFamily: 'var(--font-semibold)' }}>
                RESPOSTA
              </label>
              <div
                ref={respostaRef}
                contentEditable
                onFocus={() => setCampoAtivo('resposta')}
                data-placeholder="Digite sua resposta aqui..."
                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                style={{ fontFamily: 'var(--font-medium)' }}
              />
            </div>

            {/* Campo Explicação */}
            <div className="flex-1 flex flex-col">
              <label className="text-sm text-gray-500 mb-2 block" style={{ fontFamily: 'var(--font-semibold)' }}>
                EXPLICAÇÃO
              </label>
              <div
                ref={explicacaoRef}
                contentEditable
                onFocus={() => setCampoAtivo('explicacao')}
                data-placeholder="Explique seu raciocínio passo a passo..."
                className="w-full flex-1 min-h-[200px] p-4 bg-gray-50 border border-gray-200 rounded-xl overflow-y-auto focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
                style={{ fontFamily: 'var(--font-medium)' }}
              />
            </div>

            {/* Debug: mostrar contador */}
            <div className="mt-2 text-xs text-gray-400">
              Arquivos anexados: {arquivosAnexados.length}
            </div>

            {/* Preview de arquivos anexados */}
            {arquivosAnexados.length > 0 && (
              <div className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-600 mb-2 font-medium">Arquivos anexados:</p>
                <div className="flex flex-wrap gap-2">
                  {arquivosAnexados.map((arquivo, index) => (
                    <div key={index} className="relative group">
                      {arquivo.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(arquivo)}
                          alt={arquivo.name}
                          className="w-16 h-16 object-cover rounded-lg border border-blue-200"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-white rounded-lg border border-blue-200 flex items-center justify-center">
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
              </div>
            )}

            {/* Barra de ferramentas */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-1 relative">
                {/* Formatação de texto */}
                <div className="flex items-center gap-1 pr-3 border-r border-gray-200">
                  <button
                    onClick={() => inserirFormatacao("bold")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer font-bold focus:outline-none"
                    title="Negrito"
                  >
                    B
                  </button>
                  <button
                    onClick={() => inserirFormatacao("italic")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer italic focus:outline-none"
                    title="Itálico"
                  >
                    I
                  </button>
                  <button
                    onClick={() => inserirFormatacao("underline")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer underline focus:outline-none"
                    title="Sublinhado"
                  >
                    U
                  </button>
                </div>

                {/* Tamanho do texto */}
                <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                  <button
                    onClick={() => inserirFormatacao("h1")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer text-lg font-bold focus:outline-none"
                    title="Título"
                  >
                    T
                  </button>
                  <button
                    onClick={() => inserirFormatacao("h2")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer text-sm font-bold focus:outline-none"
                    title="Subtítulo"
                  >
                    T
                  </button>
                </div>

                {/* Listas */}
                <div className="flex items-center gap-1 px-3 border-r border-gray-200">
                  <button
                    onClick={() => inserirFormatacao("ul")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none"
                    title="Lista"
                  >
                    ≡
                  </button>
                  <button
                    onClick={() => inserirFormatacao("ol")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none"
                    title="Lista numerada"
                  >
                    1.
                  </button>
                </div>

                {/* Símbolos especiais */}
                <div className="flex items-center gap-1 px-3 border-r border-gray-200 relative">
                  <button
                    onClick={() => inserirFormatacao("math")}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none"
                    title="Fórmula matemática"
                  >
                    √x
                  </button>
                  <button
                    onClick={() => inserirFormatacao("symbols")}
                    className={`w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none ${mostrarSimbolos ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    title="Símbolos especiais"
                  >
                    Ω
                  </button>

                  {/* Dropdown de símbolos com categorias */}
                  {mostrarSimbolos && (
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50 w-80">
                      {/* Categorias */}
                      <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-gray-100">
                        {Object.keys(categoriaSimbolos).map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setCategoriaAtiva(cat)}
                            className={`px-2 py-1 text-xs rounded-full transition-colors focus:outline-none ${categoriaAtiva === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            style={{ fontFamily: 'var(--font-medium)' }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      {/* Grid de símbolos */}
                      <div className="grid grid-cols-10 gap-1">
                        {categoriaSimbolos[categoriaAtiva].map((simbolo, idx) => (
                          <button
                            key={idx}
                            onClick={() => inserirSimbolo(simbolo)}
                            className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-blue-100 hover:text-blue-600 rounded transition-colors cursor-pointer text-sm focus:outline-none"
                          >
                            {simbolo}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Anexar */}
                <div className="flex items-center gap-1 pl-3">
                  <button
                    onClick={handleAnexar}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer focus:outline-none"
                    title="Anexar arquivo"
                  >
                    <Attachment01Icon size={18} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Editor de Equações */}
      {mostrarEditorEquacao && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
            {/* Header do modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                Editor de Equações
              </h3>
              <button
                onClick={() => setMostrarPreview(!mostrarPreview)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors focus:outline-none ${mostrarPreview ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                {mostrarPreview ? 'Editar' : 'Visualizar'}
              </button>
            </div>

            {/* Templates de equação */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <div className="flex flex-wrap gap-2">
                {templatesEquacao.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => inserirTemplateEquacao(t.template)}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors cursor-pointer focus:outline-none group"
                    title={t.titulo}
                  >
                    <span className="text-gray-700 group-hover:text-blue-600" style={{ fontFamily: 'var(--font-medium)' }}>
                      {t.icone}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Área de edição/preview */}
            <div className="p-6">
              {mostrarPreview ? (
                <div
                  className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg whitespace-pre-wrap"
                  style={{ fontFamily: 'var(--font-medium)' }}
                >
                  {equacao || <span className="text-gray-400">Nenhuma equação digitada</span>}
                </div>
              ) : (
                <textarea
                  ref={equacaoInputRef}
                  value={equacao}
                  onChange={(e) => setEquacao(e.target.value)}
                  placeholder="Digite uma equação... Ex: x² + 2x + 1 = 0"
                  className="w-full min-h-[150px] p-4 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 text-lg"
                  style={{ fontFamily: 'var(--font-medium)' }}
                  autoFocus
                />
              )}
            </div>

            {/* Footer com botões */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={cancelarEquacao}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer focus:outline-none"
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                CANCELAR
              </button>
              <button
                onClick={inserirEquacaoNoEditor}
                disabled={!equacao.trim()}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none"
                style={{ fontFamily: 'var(--font-semibold)' }}
              >
                INSERIR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
