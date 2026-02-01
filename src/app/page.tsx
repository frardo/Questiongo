"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginWithGoogle, loginWithApple, loginWithEmail, registerWithEmail } from "@/lib/firebase";

const ALLOWED_DOMAINS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.com.br",
  "live.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
];

const isEmailAllowed = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
};

export default function LandingPage() {
  const router = useRouter();
  const [modalAberto, setModalAberto] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saldoDemo, setSaldoDemo] = useState(0);

  // Animação do saldo no demo - sincronizado com o ciclo de 20s
  useEffect(() => {
    const CYCLE_DURATION = 20000; // 20 segundos
    // Frame 3 (Carteira) aparece em 67% = 13.4s
    const SALDO_START = 14500; // Começa a contar em 14.5s
    const SALDO_END = 16500; // Termina de contar em 16.5s
    const FADE_OUT = 19000; // Saldo volta a 0 no fade out

    const animate = () => {
      const now = Date.now();
      const cycleTime = now % CYCLE_DURATION;

      if (cycleTime >= SALDO_START && cycleTime < SALDO_END) {
        const progress = (cycleTime - SALDO_START) / (SALDO_END - SALDO_START);
        const eased = 1 - Math.pow(1 - progress, 3);
        setSaldoDemo(Math.round(eased * 15));
      } else if (cycleTime >= SALDO_END && cycleTime < FADE_OUT) {
        setSaldoDemo(15);
      } else {
        setSaldoDemo(0);
      }
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, []);

  const abrirModal = () => {
    setModalAberto(true);
    setShowEmailForm(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  const fecharModal = () => {
    setModalAberto(false);
    setShowEmailForm(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      router.push("/home");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };

      // Ignorar erros de cancelamento pelo usuário
      if (firebaseError.code === "auth/cancelled-popup-request" ||
          firebaseError.code === "auth/popup-closed-by-user") {
        return;
      }

      // Mapear erros do Firebase para mensagens amigáveis
      const errorMessages: Record<string, string> = {
        "auth/popup-blocked": "Pop-up bloqueado. Permita pop-ups para este site.",
        "auth/network-request-failed": "Erro de conexão. Verifique sua internet.",
        "auth/unauthorized-domain": "Domínio não autorizado. Configure o Firebase Console.",
        "auth/operation-not-allowed": "Login com Google não está habilitado.",
        "auth/internal-error": "Erro interno. Tente novamente.",
      };

      const errorMessage = firebaseError.code
        ? errorMessages[firebaseError.code] || `Erro: ${firebaseError.code}`
        : "Erro ao fazer login. Tente novamente.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await loginWithApple();
      router.push("/home");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code !== "auth/cancelled-popup-request" &&
          firebaseError.code !== "auth/popup-closed-by-user") {
        console.error("Erro ao fazer login com Apple:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email || !password) return;

    if (!isEmailAllowed(email)) {
      setError("Use um email válido (Gmail, Hotmail, Outlook, Yahoo ou iCloud)");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await loginWithEmail(email, password);
      router.push("/home");
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };

      if (firebaseError.code === "auth/invalid-credential" ||
          firebaseError.code === "auth/user-not-found") {
        try {
          await registerWithEmail(email, password);
          router.push("/home");
        } catch (registerError: unknown) {
          const regError = registerError as { code?: string };
          if (regError.code === "auth/email-already-in-use") {
            setError("Senha incorreta");
          } else if (regError.code === "auth/weak-password") {
            setError("Senha muito fraca. Use pelo menos 6 caracteres");
          } else {
            setError("Erro ao criar conta. Tente novamente.");
            console.error("Erro:", registerError);
          }
        }
      } else if (firebaseError.code === "auth/wrong-password") {
        setError("Senha incorreta");
      } else {
        setError("Erro ao autenticar. Tente novamente.");
        console.error("Erro:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "Pergunte Qualquer Coisa",
      items: [
        "Todas as matérias do ensino médio e superior",
        "Defina o valor que quer pagar pela resposta",
        "Receba múltiplas respostas de especialistas"
      ]
    },
    {
      title: "Respostas Rápidas",
      items: [
        "Especialistas online 24/7 prontos para ajudar",
        "Média de resposta em menos de 30 minutos",
        "Notificação instantânea quando receber resposta"
      ]
    },
    {
      title: "Ganhe Dinheiro",
      items: [
        "Responda perguntas e receba por cada uma",
        "Saque rápido direto para sua conta",
        "Quanto melhor sua resposta, mais você ganha"
      ]
    },
    {
      title: "Ranking de Especialistas",
      items: [
        "Suba no ranking conforme ajuda mais pessoas",
        "Top especialistas ganham destaque na plataforma",
        "Construa sua reputação como expert"
      ]
    },
    {
      title: "Seguro e Confiável",
      items: [
        "Pagamento só é liberado após aceitar resposta",
        "Sistema de avaliação para garantir qualidade",
        "Suporte disponível para resolver problemas"
      ]
    },
    {
      title: "Fácil de Usar",
      items: [
        "Interface simples e intuitiva",
        "Funciona no celular e computador",
        "Crie sua conta em segundos com Google"
      ]
    },
    {
      title: "Todas as Matérias",
      items: [
        "Matemática, Física, Química, Biologia",
        "História, Geografia, Português, Inglês",
        "Direito, Administração, Psicologia e mais"
      ]
    },
    {
      title: "Para Estudantes",
      items: [
        "Ideal para ENEM, vestibulares e provas",
        "Tire dúvidas específicas do seu material",
        "Aprenda com explicações detalhadas"
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0A3D2A] text-[#1a1a1a]" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#e5e5e5]">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2 font-bold text-lg">
            <img src="/logo.svg" alt="Questiongo" className="w-9 h-9" />
            Questiongo
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#como-funciona" className="text-sm font-medium hover:text-[#FF4F00] transition-colors">Como Funciona</a>
            <a href="#features" className="text-sm font-medium hover:text-[#FF4F00] transition-colors">Recursos</a>
            <a href="#" className="text-sm font-medium hover:text-[#FF4F00] transition-colors">Preços</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={abrirModal}
              className="px-5 py-2.5 bg-[#FF4F00] text-white rounded-md text-sm font-medium hover:bg-[#E64500] transition-colors cursor-pointer"
            >
              Cadastrar
            </button>
            <button
              onClick={abrirModal}
              className="px-5 py-2.5 text-sm font-medium hover:bg-[#f5f5f5] rounded-md transition-colors cursor-pointer"
            >
              Entrar
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center pt-32 pb-20 px-6 text-center overflow-hidden">
        {/* Grid Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
            backgroundSize: '100px 100px',
            maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)'
          }}
        />

        <div className="relative z-10">
          {/* Logo */}
          <div className="w-32 h-32 mx-auto mb-10">
            <img src="/logo.svg" alt="Questiongo" className="w-full h-full" />
          </div>

          {/* Title */}
          <h1 className="text-[clamp(48px,8vw,96px)] font-bold leading-[1.05] mb-8 tracking-[-0.03em]">
            Sua dúvida vale dinheiro.<br />
            <span className="text-[#FF4F00]">Sua resposta também.</span>
          </h1>

          {/* CTA Button */}
          <button
            onClick={abrirModal}
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#FF4F00] text-white text-base font-semibold rounded-lg hover:bg-[#E64500] transition-colors cursor-pointer"
          >
            Começar agora
            <span className="w-5 h-5 bg-white/30 rounded-full flex items-center justify-center text-xs">
              →
            </span>
          </button>

          <p className="mt-6 text-base text-[#666] max-w-md mx-auto leading-relaxed">
            Junte-se a <span className="font-semibold text-[#1a1a1a]">50 mil estudantes</span> que já tiraram suas dúvidas e <span className="font-semibold text-[#1a1a1a]">especialistas</span> que ganham dinheiro ensinando.
          </p>
        </div>

        {/* Browser Window Preview - Demo Animada Profissional */}
        <div className="mt-16 w-full max-w-5xl mx-auto relative z-10">
          {/* Barra do navegador estilo macOS */}
          <div className="bg-[#e8e8e8] rounded-t-xl px-4 py-3 flex items-center gap-3 border-b border-[#d1d1d1]">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-inner"></div>
              <div className="w-3 h-3 rounded-full bg-[#27ca40] shadow-inner"></div>
            </div>
            <div className="flex-1 bg-white rounded-lg px-4 py-1.5 text-xs text-[#666] flex items-center gap-2 shadow-sm border border-[#d1d1d1]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              <span className="demo-url-text">questiongo.com.br</span>
            </div>
          </div>

          {/* Conteúdo da preview */}
          <div className="relative bg-white border-x border-[#e5e5e5] overflow-hidden" style={{ boxShadow: '-8px 0 20px -5px rgba(0,0,0,0.08), 8px 0 20px -5px rgba(0,0,0,0.08)' }}>

            {/* ========== FRAME 1: TELA HOME - FIEL AO DESIGN REAL ========== */}
            <div className="demo-frame-home flex flex-col h-[480px] bg-white">
              {/* Header - Igual ao real */}
              <header className="h-12 border-b border-gray-100 px-4 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-1.5">
                  <img src="/logo.svg" alt="Questiongo" className="h-6 w-auto" />
                  <span className="text-sm font-black text-gray-900">Questiongo</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">
                    FAÇA SUA PERGUNTA
                  </button>
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold">JD</div>
                </div>
              </header>

              {/* Container principal */}
              <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Esquerda - Menu igual ao real */}
                <div className="w-40 bg-white border-r border-gray-100 p-3 flex-shrink-0 hidden md:flex flex-col">
                  <nav className="space-y-0.5 flex-1">
                    <a className="flex items-center gap-2 px-3 py-2 text-gray-800 bg-gray-200 rounded-full text-[10px] font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                      Início
                    </a>
                    <a className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full text-[10px] font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92c-.57.57-.95 1.25-.95 2.38v.45h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                      Minhas Perguntas
                    </a>
                    <a className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full text-[10px] font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      Minhas Respostas
                    </a>
                    <a className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full text-[10px] font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                      Carteira
                    </a>
                    <a className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-full text-[10px] font-semibold">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                      Salvos
                    </a>
                  </nav>
                </div>

                {/* Conteúdo Central */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Barra de filtros de matérias - ícones como no real */}
                  <div className="py-2 border-b border-gray-100 flex justify-center items-center gap-1">
                    <button className="p-1.5 rounded-full bg-gray-200 text-gray-800"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v2h1v14c0 2.21 1.79 4 4 4s4-1.79 4-4V4h1V2H7zm6 16c0 1.1-.9 2-2 2s-2-.9-2-2v-4h4v4z"/></svg></button>
                    <button className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/></svg></button>
                  </div>

                  {/* Área de conteúdo com scroll */}
                  <div className="flex-1 p-4 flex gap-4 overflow-hidden">
                    {/* Coluna de perguntas */}
                    <div className="flex-1 flex flex-col min-w-0">
                      {/* Título grande como no real */}
                      <div className="mb-3">
                        <h1 className="text-xl font-black leading-none" style={{ color: '#0F1A45' }}>Respostas para</h1>
                        <h1 className="text-xl font-black leading-none" style={{ color: '#0F1A45' }}>qualquer disciplina</h1>
                      </div>
                      <button className="px-4 py-2 bg-black text-white text-[10px] font-bold rounded-full mb-3 self-start">
                        FAÇA SUA PERGUNTA
                      </button>

                      {/* Linha divisora */}
                      <div className="border-b border-gray-200 mb-3"></div>

                      {/* Filtros dropdown */}
                      <div className="flex gap-2 mb-3">
                        <div className="px-3 py-1.5 bg-gray-100 rounded-full text-[9px] text-gray-700 font-medium flex items-center gap-1">
                          Todos os níveis <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                        <div className="px-3 py-1.5 bg-gray-100 rounded-full text-[9px] text-gray-700 font-medium flex items-center gap-1">
                          Sem Resposta <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                      </div>

                      {/* Lista de perguntas - igual ao real */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden flex-1">
                        {/* Pergunta 1 */}
                        <div className="demo-question-1 p-3 border-b border-gray-200 relative">
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            <span className="bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-full">R$ 15,00</span>
                          </div>
                          <div className="flex items-start gap-2 pr-20">
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">JD</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 text-[9px]">
                                <span className="font-bold text-gray-800">Matemática</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-bold text-gray-400">há 5 min</span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500 flex items-center gap-0.5">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
                                  Entregar até 25/01
                                </span>
                              </div>
                              <p className="text-[11px] text-black mb-2">Como resolver uma equação do 2º grau usando a fórmula de Bhaskara?</p>
                              <div className="flex justify-end">
                                <button className="demo-btn-responder-1 px-3 py-1 bg-white text-[9px] font-bold rounded-full border-2 border-gray-800 text-gray-800">RESPONDER</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pergunta 2 */}
                        <div className="p-3 border-b border-gray-200 relative">
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                            <span className="bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-full">R$ 20,00</span>
                          </div>
                          <div className="flex items-start gap-2 pr-20">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">MC</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 text-[9px]">
                                <span className="font-bold text-gray-800">Português</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-bold text-gray-400">há 12 min</span>
                              </div>
                              <p className="text-[11px] text-black">Faça uma redação sobre sustentabilidade ambiental</p>
                            </div>
                          </div>
                        </div>

                        {/* Pergunta 3 */}
                        <div className="p-3 relative opacity-70">
                          <div className="absolute top-3 right-3">
                            <span className="bg-gray-100 text-gray-700 text-[9px] font-bold px-2 py-1 rounded-full">R$ 18,00</span>
                          </div>
                          <div className="flex items-start gap-2 pr-16">
                            <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">AS</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 text-[9px]">
                                <span className="font-bold text-gray-800">História</span>
                                <span className="text-gray-400">•</span>
                                <span className="font-bold text-gray-400">há 25 min</span>
                              </div>
                              <p className="text-[11px] text-black">Resumo sobre a Revolução Francesa e suas causas</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna direita - Ganhos e Ranking */}
                    <div className="w-44 flex-shrink-0 flex flex-col gap-3 hidden lg:flex">
                      {/* Card Seus Ganhos */}
                      <div className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>
                          <span className="text-[10px] font-bold text-gray-800">Seus Ganhos</span>
                        </div>
                        <div className="px-2 py-1.5 bg-gray-100 rounded-full text-[8px] text-gray-700 font-medium flex items-center justify-between mb-2">
                          Todo o período <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-2.5 mb-2">
                          <p className="text-[8px] text-gray-500 mb-0.5">Total Ganho</p>
                          <p className="text-xl font-black text-green-600">R$ 847,50</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-2.5 flex items-center justify-between">
                          <div>
                            <p className="text-[8px] text-gray-500 mb-0.5">Saldo Disponível</p>
                            <p className="text-base font-black text-gray-900">R$ 347,50</p>
                          </div>
                          <button className="px-2 py-1 bg-green-500 text-white text-[8px] font-semibold rounded-full">Sacar</button>
                        </div>
                      </div>

                      {/* Card Melhores Usuários */}
                      <div className="border border-gray-200 rounded-xl p-3 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#eab308"><path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z"/></svg>
                            <span className="text-[10px] font-bold text-gray-800">Melhores usuários</span>
                          </div>
                          <span className="text-[8px] text-blue-500 font-medium">Ver todos</span>
                        </div>
                        <div className="px-2 py-1.5 bg-gray-100 rounded-full text-[8px] text-gray-700 font-medium flex items-center justify-between mb-2">
                          Semanal <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                            <span className="text-[9px] font-bold text-amber-600 w-3">1º</span>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-[7px] font-bold">JS</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-semibold text-gray-800 truncate">João Silva</p>
                              <p className="text-[7px] text-gray-500">142 respostas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg">
                            <span className="text-[9px] font-bold text-gray-500 w-3">2º</span>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-[7px] font-bold">MC</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-semibold text-gray-800 truncate">Maria Costa</p>
                              <p className="text-[7px] text-gray-500">128 respostas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg">
                            <span className="text-[9px] font-bold text-gray-500 w-3">3º</span>
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center text-white text-[7px] font-bold">PO</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[8px] font-semibold text-gray-800 truncate">Pedro Oliveira</p>
                              <p className="text-[7px] text-gray-500">115 respostas</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== FRAME 2: TELA RESPONDER ========== */}
            <div className="demo-frame-responder absolute inset-0 bg-[#fafafa] flex flex-col">
              {/* Header */}
              <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  </button>
                  <img src="/logo.svg" alt="Questiongo" className="h-7" />
                </div>
                <div className="flex items-center gap-3">
                  <button className="px-3 py-1.5 text-gray-500 text-xs font-medium hover:bg-gray-100 rounded-lg transition-all flex items-center gap-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                    Como responder bem
                  </button>
                  <button className="demo-btn-enviar px-5 py-2 bg-blue-500 text-white text-xs font-bold rounded-full hover:bg-blue-600 transition-all shadow-lg shadow-blue-200">ENVIAR RESPOSTA</button>
                </div>
              </div>

              {/* Conteúdo em grid */}
              <div className="flex-1 p-5 grid grid-cols-2 gap-5 overflow-hidden">
                {/* Lado esquerdo - Pergunta */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs rounded-full font-semibold">Redação</span>
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold">ENEM</span>
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-bold ml-auto">R$ 25,00</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Tarefa</p>
                    <p className="text-sm text-gray-800 leading-relaxed">Preciso de uma redação dissertativa-argumentativa sobre <strong>sustentabilidade ambiental no Brasil contemporâneo</strong>. Deve seguir o modelo ENEM com introdução, 2 desenvolvimentos e conclusão com proposta de intervenção.</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Requisitos</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>Mínimo 20 linhas</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>Proposta de intervenção completa</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-rose-400 rounded-full"></span>Repertório sociocultural</li>
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] text-gray-400">Entregar até: <span className="text-gray-600 font-medium">26/01/2026 às 23:59</span></p>
                    <div className="flex items-center gap-1 text-amber-500">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>
                      <span className="text-[10px] font-medium">2 dias restantes</span>
                    </div>
                  </div>
                </div>

                {/* Lado direito - Editor */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col shadow-sm">
                  <div className="flex-1 flex flex-col">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">Sua resposta</p>
                    <div className="demo-editor bg-gray-50 rounded-xl p-4 flex-1 border border-gray-100 overflow-hidden">
                      <p className="text-xs text-gray-800 demo-typing leading-relaxed">
                        <span className="demo-line-1 block font-semibold text-gray-900 mb-2">Redação: Sustentabilidade Ambiental no Brasil</span>
                        <span className="demo-line-2 block mb-2">A questão ambiental no Brasil contemporâneo apresenta-se como um dos maiores desafios do século XXI. Diante do avanço do desmatamento e das mudanças climáticas...</span>
                        <span className="demo-line-3 block mb-2">Nesse contexto, é fundamental que o poder público implemente políticas efetivas de preservação, aliadas à conscientização da população...</span>
                        <span className="demo-line-4 block text-green-600 font-medium">✓ Proposta de intervenção: Criação de incentivos fiscais para empresas sustentáveis...</span>
                      </p>
                    </div>
                  </div>

                  {/* Barra de ferramentas */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all">B</button>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xs italic transition-all">I</button>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-xs underline transition-all">U</button>
                      <div className="w-px h-5 bg-gray-200 mx-1"></div>
                      <button className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg transition-all">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="demo-word-count">324 palavras</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span className="text-green-500 font-medium demo-status">Pronto para enviar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ========== FRAME 3: TELA CARTEIRA ========== */}
            <div className="demo-frame-carteira absolute inset-0 bg-[#fafafa] flex">
              {/* Sidebar */}
              <div className="w-56 bg-white border-r border-gray-100 p-4 flex-shrink-0 flex flex-col shadow-sm">
                <div className="flex items-center gap-2 mb-8">
                  <img src="/logo.svg" alt="Questiongo" className="h-8" />
                </div>
                <nav className="space-y-1 flex-1">
                  <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 text-xs hover:bg-gray-50 rounded-xl transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
                    Início
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 text-xs hover:bg-gray-50 rounded-xl transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                    Minhas Perguntas
                  </div>
                  <div className="demo-menu-carteira flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                    Carteira
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-gray-500 text-xs hover:bg-gray-50 rounded-xl transition-all">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
                    Salvos
                  </div>
                </nav>
              </div>

              {/* Conteúdo principal */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="bg-white py-4 border-b border-gray-100 px-6 flex items-center justify-between shadow-sm">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Carteira</h2>
                    <p className="text-xs text-gray-500">Gerencie seus ganhos e saques</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">JD</div>
                </div>

                {/* Cards de saldo */}
                <div className="p-6">
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {/* Saldo Disponível */}
                    <div className="demo-card-saldo bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-xl shadow-green-200/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <div className="flex items-center justify-between mb-3 relative">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" opacity="0.9"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                        <button className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-semibold hover:bg-white/30 transition-all backdrop-blur-sm">Sacar</button>
                      </div>
                      <p className="text-green-100 text-[10px] mb-1 relative">Saldo Disponível</p>
                      <p className="text-2xl font-black relative demo-saldo-valor">R$ {saldoDemo.toFixed(2).replace('.', ',')}</p>
                    </div>

                    {/* Saldo Pendente */}
                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-4 text-white shadow-xl shadow-amber-200/50 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <div className="mb-3 relative">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" opacity="0.9"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/></svg>
                      </div>
                      <p className="text-amber-100 text-[10px] mb-1 relative">Pendente</p>
                      <p className="text-2xl font-black relative">R$ 0,00</p>
                    </div>

                    {/* Total Ganho */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><path d="M7 14l5-5 5 5H7z"/></svg>
                        </div>
                      </div>
                      <p className="text-gray-500 text-[10px] mb-1">Total Ganho</p>
                      <p className="text-2xl font-black text-gray-900 demo-total-ganho">R$ {saldoDemo.toFixed(2).replace('.', ',')}</p>
                    </div>

                    {/* Total Sacado */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="#3b82f6"><path d="M7 10l5 5 5-5H7z"/></svg>
                        </div>
                      </div>
                      <p className="text-gray-500 text-[10px] mb-1">Total Sacado</p>
                      <p className="text-2xl font-black text-gray-900">R$ 0,00</p>
                    </div>
                  </div>

                  {/* Histórico */}
                  <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900">Histórico recente</h3>
                      <button className="text-xs text-blue-500 font-medium hover:text-blue-600 transition-all">Ver tudo →</button>
                    </div>

                    <div className="space-y-3">
                      {/* Transação nova */}
                      <div className="demo-transacao-new flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="#22c55e"><path d="M7 14l5-5 5 5H7z"/></svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 font-medium">Resposta aceita - Redação</p>
                          <p className="text-[10px] text-gray-500">Agora mesmo</p>
                        </div>
                        <p className="text-sm font-bold text-green-600">+R$ 25,00</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notificação de sucesso */}
                <div className="demo-notificacao absolute top-16 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-2xl shadow-green-500/30 z-30">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                  Pagamento recebido! +R$ 25,00
                </div>

                {/* Confetti/Celebração */}
                <div className="demo-confetti absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="confetti-1 absolute w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="confetti-2 absolute w-2 h-2 bg-blue-400 rounded-sm"></div>
                  <div className="confetti-3 absolute w-2 h-2 bg-amber-400 rounded-full"></div>
                  <div className="confetti-4 absolute w-2 h-2 bg-rose-400 rounded-sm"></div>
                  <div className="confetti-5 absolute w-2 h-2 bg-purple-400 rounded-full"></div>
                  <div className="confetti-6 absolute w-3 h-1 bg-green-500"></div>
                  <div className="confetti-7 absolute w-3 h-1 bg-blue-500"></div>
                  <div className="confetti-8 absolute w-3 h-1 bg-amber-500"></div>
                </div>
              </div>
            </div>

            {/* Gradiente de fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-20" style={{ background: 'linear-gradient(to bottom, transparent 0%, white 80%, white 100%)' }} />

            {/* CURSOR REALISTA */}
            <div className="demo-cursor absolute pointer-events-none z-[100]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="drop-shadow-lg">
                <path d="M5.5 3.21V20.8C5.5 21.39 6.21 21.71 6.66 21.33L10.88 17.62L14.22 23.22C14.5 23.71 15.12 23.88 15.61 23.6L17.62 22.44C18.11 22.16 18.28 21.54 18 21.05L14.67 15.47L20.15 14.88C20.73 14.82 21.03 14.12 20.63 13.68L6.64 2.68C6.21 2.22 5.5 2.52 5.5 3.21Z" fill="white" stroke="black" strokeWidth="1"/>
              </svg>
              <div className="click-effect absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-blue-400 scale-0 opacity-0"></div>
            </div>

          </div>

          {/* CSS Animações Profissionais - 24s */}
          <style jsx>{`
            /* ===== CONFIGURAÇÃO: 24 segundos total ===== */
            /* Frame 1 (Home): 0-8s = 0-33% */
            /* Frame 2 (Responder): 8-16s = 33-67% */
            /* Frame 3 (Carteira): 16-24s = 67-100% */

            /* ===== CURSOR REALISTA ===== */
            .demo-cursor {
              animation: cursor-journey 24s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }

            @keyframes cursor-journey {
              /* INICIO - Aparece suavemente */
              0% { top: 120px; left: 350px; opacity: 0; transform: scale(1); }
              2% { top: 120px; left: 350px; opacity: 1; }

              /* Frame 1: Navega pela home, explora cards */
              4% { top: 140px; left: 380px; }
              8% { top: 180px; left: 420px; }
              12% { top: 220px; left: 500px; }
              16% { top: 260px; left: 580px; }
              20% { top: 290px; left: 620px; }

              /* Hover no botão RESPONDER */
              24% { top: 295px; left: 635px; }
              26% { top: 295px; left: 635px; transform: scale(0.92); }
              28% { top: 295px; left: 635px; transform: scale(1); }
              32% { top: 295px; left: 635px; }

              /* Frame 2: Navega pelo editor */
              36% { top: 180px; left: 550px; }
              42% { top: 250px; left: 600px; }
              48% { top: 300px; left: 580px; }
              52% { top: 350px; left: 620px; }

              /* Move para botão ENVIAR */
              58% { top: 35px; left: 680px; }
              60% { top: 35px; left: 680px; transform: scale(0.92); }
              62% { top: 35px; left: 680px; transform: scale(1); }
              66% { top: 35px; left: 680px; }

              /* Frame 3: Explora carteira */
              70% { top: 150px; left: 400px; }
              76% { top: 180px; left: 320px; }
              82% { top: 220px; left: 380px; }
              88% { top: 320px; left: 450px; }
              94% { top: 350px; left: 500px; opacity: 1; }

              /* Fade out */
              98% { top: 350px; left: 500px; opacity: 0; }
              100% { top: 120px; left: 350px; opacity: 0; }
            }

            .click-effect {
              animation: click-pulse 24s ease-out infinite;
            }

            @keyframes click-pulse {
              0%, 25% { transform: scale(0); opacity: 0; }
              26%, 27% { transform: scale(1.2); opacity: 0.6; }
              29%, 59% { transform: scale(0); opacity: 0; }
              60%, 61% { transform: scale(1.2); opacity: 0.6; }
              63%, 100% { transform: scale(0); opacity: 0; }
            }

            /* ===== TRANSIÇÃO ENTRE FRAMES ===== */
            .demo-frame-home {
              animation: frame1 24s ease-in-out infinite;
            }
            @keyframes frame1 {
              0%, 30% { opacity: 1; transform: translateX(0); }
              33%, 97% { opacity: 0; transform: translateX(-20px); }
              100% { opacity: 1; transform: translateX(0); }
            }

            .demo-frame-responder {
              animation: frame2 24s ease-in-out infinite;
            }
            @keyframes frame2 {
              0%, 30% { opacity: 0; transform: translateX(20px); }
              33%, 64% { opacity: 1; transform: translateX(0); }
              67%, 100% { opacity: 0; transform: translateX(-20px); }
            }

            .demo-frame-carteira {
              animation: frame3 24s ease-in-out infinite;
            }
            @keyframes frame3 {
              0%, 64% { opacity: 0; transform: translateX(20px); }
              67%, 96% { opacity: 1; transform: translateX(0); }
              100% { opacity: 0; transform: translateX(20px); }
            }

            /* ===== URL BAR ===== */
            .demo-url-text {
              animation: url-change 24s ease-in-out infinite;
            }
            @keyframes url-change {
              0%, 30% { content: 'questiongo.com.br/mercado'; }
              33%, 64% { content: 'questiongo.com.br/responder'; }
              67%, 100% { content: 'questiongo.com.br/carteira'; }
            }

            /* ===== FRAME 1: INTERAÇÕES HOME ===== */
            .demo-question-1 {
              animation: q1-highlight 24s ease-in-out infinite;
            }
            @keyframes q1-highlight {
              0%, 14% { background: white; box-shadow: none; }
              18%, 30% { background: #fef7ed; box-shadow: 0 0 0 2px #f97316, 0 8px 25px -5px rgba(249, 115, 22, 0.25); }
              33%, 100% { background: white; box-shadow: none; }
            }

            .demo-btn-responder-1 {
              animation: btn1-click 24s ease-in-out infinite;
            }
            @keyframes btn1-click {
              0%, 24% { background: #111827; transform: scale(1); }
              26%, 30% { background: #f97316; transform: scale(1.08); box-shadow: 0 4px 15px rgba(249, 115, 22, 0.4); }
              33%, 100% { background: #111827; transform: scale(1); box-shadow: none; }
            }

            /* ===== FRAME 2: DIGITAÇÃO ===== */
            .demo-typing .demo-line-1,
            .demo-typing .demo-line-2,
            .demo-typing .demo-line-3,
            .demo-typing .demo-line-4 {
              opacity: 0;
              transform: translateY(5px);
            }

            .demo-typing .demo-line-1 { animation: type-in 24s ease-out infinite; animation-delay: 0s; }
            .demo-typing .demo-line-2 { animation: type-in 24s ease-out infinite; animation-delay: 0.8s; }
            .demo-typing .demo-line-3 { animation: type-in 24s ease-out infinite; animation-delay: 1.6s; }
            .demo-typing .demo-line-4 { animation: type-in 24s ease-out infinite; animation-delay: 2.4s; }

            @keyframes type-in {
              0%, 38% { opacity: 0; transform: translateY(5px); }
              42%, 64% { opacity: 1; transform: translateY(0); }
              67%, 100% { opacity: 0; transform: translateY(5px); }
            }

            .demo-btn-enviar {
              animation: btn-send 24s ease-in-out infinite;
            }
            @keyframes btn-send {
              0%, 58% { background: #3b82f6; transform: scale(1); }
              60%, 64% { background: #22c55e; transform: scale(1.05); box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4); }
              67%, 100% { background: #3b82f6; transform: scale(1); }
            }

            .demo-word-count {
              animation: count-up 24s ease-out infinite;
            }
            @keyframes count-up {
              0%, 38% { opacity: 0; }
              42% { opacity: 1; }
              64%, 100% { opacity: 0; }
            }

            .demo-status {
              animation: status-ready 24s ease-out infinite;
            }
            @keyframes status-ready {
              0%, 52% { opacity: 0; }
              56%, 64% { opacity: 1; }
              67%, 100% { opacity: 0; }
            }

            /* ===== FRAME 3: CARTEIRA ===== */
            .demo-notificacao {
              animation: notif-slide 24s ease-out infinite;
            }
            @keyframes notif-slide {
              0%, 69% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.9); }
              72% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
              92% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
              96%, 100% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.95); }
            }

            .demo-card-saldo {
              animation: card-pulse 24s ease-in-out infinite;
            }
            @keyframes card-pulse {
              0%, 72% { transform: scale(1); }
              76% { transform: scale(1.03); }
              80%, 90% { transform: scale(1.02); box-shadow: 0 20px 40px -10px rgba(34, 197, 94, 0.4); }
              94%, 100% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(34, 197, 94, 0.3); }
            }

            .demo-transacao-new {
              animation: transacao-appear 24s ease-out infinite;
            }
            @keyframes transacao-appear {
              0%, 76% { opacity: 0; transform: translateY(15px) scale(0.95); }
              80%, 94% { opacity: 1; transform: translateY(0) scale(1); }
              98%, 100% { opacity: 0; }
            }

            /* ===== CONFETTI ===== */
            .demo-confetti > div {
              opacity: 0;
            }

            .confetti-1 { animation: confetti-fall 24s ease-out infinite; left: 30%; }
            .confetti-2 { animation: confetti-fall 24s ease-out infinite 0.1s; left: 40%; }
            .confetti-3 { animation: confetti-fall 24s ease-out infinite 0.2s; left: 50%; }
            .confetti-4 { animation: confetti-fall 24s ease-out infinite 0.15s; left: 60%; }
            .confetti-5 { animation: confetti-fall 24s ease-out infinite 0.25s; left: 70%; }
            .confetti-6 { animation: confetti-fall 24s ease-out infinite 0.05s; left: 35%; }
            .confetti-7 { animation: confetti-fall 24s ease-out infinite 0.18s; left: 55%; }
            .confetti-8 { animation: confetti-fall 24s ease-out infinite 0.22s; left: 65%; }

            @keyframes confetti-fall {
              0%, 71% { top: -10px; opacity: 0; transform: rotate(0deg) translateX(0); }
              72% { top: -10px; opacity: 1; }
              85% { top: 200px; opacity: 1; transform: rotate(720deg) translateX(20px); }
              90%, 100% { top: 300px; opacity: 0; transform: rotate(900deg) translateX(30px); }
            }
          `}</style>
        </div>

      </section>

      {/* Stats Section */}
      <section id="como-funciona" className="relative py-16 px-6 bg-white">
        <p className="text-sm text-[#666] text-center mb-8">Números que comprovam</p>
        <div className="flex flex-wrap justify-center max-w-[1000px] mx-auto">
          {[
            { number: "50k+", label: "Estudantes" },
            { number: "100k+", label: "Perguntas" },
            { number: "R$500k+", label: "Pagos" },
            { number: "4.9★", label: "Avaliação" }
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-1 min-w-[150px] px-8 py-6 border border-[#e5e5e5] -ml-px -mt-px bg-white hover:border-[#1a1a1a] hover:shadow-[4px_4px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-default relative z-0 hover:z-10"
            >
              <div className="text-2xl font-bold text-[#FF4F00]">{stat.number}</div>
              <div className="text-sm text-[#666]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="relative py-24 px-6">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage: 'linear-gradient(to right, #e5e5e5 1px, transparent 1px), linear-gradient(to bottom, #e5e5e5 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }}
        />

        <h2 className="relative text-4xl md:text-5xl font-semibold text-center mb-20 tracking-[-0.02em]">
          Como funciona
        </h2>

        <div className="relative max-w-[900px] mx-auto grid md:grid-cols-3 gap-12">
          {[
            {
              step: "01",
              title: "Faça sua pergunta",
              desc: "Poste sua dúvida, escolha a matéria e defina quanto quer pagar."
            },
            {
              step: "02",
              title: "Receba respostas",
              desc: "Especialistas competem para dar a melhor resposta para você."
            },
            {
              step: "03",
              title: "Escolha e pague",
              desc: "Aceite a melhor resposta e o pagamento vai direto pro especialista."
            }
          ].map((item, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-white text-xl font-bold">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <h2 className="text-4xl md:text-5xl font-semibold text-center mb-20 tracking-[-0.02em]">
          Recursos
        </h2>

        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, i) => (
            <div key={i} className="p-6">
              <div className="w-28 h-28 mb-5 rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src={`/cube${i + 1}.svg`}
                  alt={feature.title}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="text-base font-semibold mb-3">{feature.title}</h3>
              <ul className="space-y-2">
                {feature.items.map((item, j) => (
                  <li key={j} className="text-[13px] text-[#666] pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-[#666]">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA + Footer Section */}
      <footer className="bg-[#0a0a0a] mt-auto">
        {/* CTA */}
        <div className="py-20 px-6 border-b border-[#222]">
          <div className="max-w-[700px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FF4F00]/10 rounded-full mb-6">
              <span className="w-2 h-2 bg-[#FF4F00] rounded-full animate-pulse"></span>
              <span className="text-[#FF4F00] text-sm font-medium">Mais de 1.000 usuários ativos</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-[#888] text-lg mb-10 max-w-[500px] mx-auto">
              Crie sua conta grátis e comece a tirar dúvidas ou ganhar dinheiro respondendo perguntas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={abrirModal}
                className="px-8 py-4 bg-[#FF4F00] text-white font-semibold rounded-xl hover:bg-[#E64500] transition-all hover:scale-105 cursor-pointer"
              >
                Criar conta grátis
              </button>
              <button
                onClick={abrirModal}
                className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all cursor-pointer border border-white/20"
              >
                Já tenho conta
              </button>
            </div>
          </div>
        </div>

        {/* Footer Content */}
        <div className="max-w-[1200px] mx-auto py-16 px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.svg" alt="Questiongo" className="w-10 h-10" />
                <span className="text-white font-bold text-xl">Questiongo</span>
              </div>
              <p className="text-[#666] text-sm leading-relaxed mb-6">
                A plataforma que conecta quem tem dúvidas com quem tem conhecimento. Aprenda ou ensine e ganhe.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5 text-[#888]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5 text-[#888]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors">
                  <svg className="w-5 h-5 text-[#888]" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="text-white font-semibold mb-4">Plataforma</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Como funciona</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Fazer pergunta</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Responder perguntas</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Ranking</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Preços</a></li>
              </ul>
            </div>

            {/* Suporte */}
            <div>
              <h4 className="text-white font-semibold mb-4">Suporte</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Central de ajuda</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Fale conosco</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">FAQ</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Comunidade</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="/termos" className="text-[#666] hover:text-white transition-colors text-sm">Termos de uso</a></li>
                <li><a href="/privacidade" className="text-[#666] hover:text-white transition-colors text-sm">Política de privacidade</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">Política de cookies</a></li>
                <li><a href="#" className="text-[#666] hover:text-white transition-colors text-sm">LGPD</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-[#222] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[#555] text-sm">© 2026 Questiongo. Todos os direitos reservados.</p>
            <div className="flex items-center gap-6">
              <span className="text-[#555] text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Feito no Brasil
              </span>
              <span className="text-[#555] text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Pagamentos seguros
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={fecharModal}
          />

          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <button
              onClick={fecharModal}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-[#666] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] rounded-full transition-colors cursor-pointer z-10"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <img src="/logo.svg" alt="Questiongo" className="w-12 h-12" />
                </div>
                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-1">
                  Bem-vindo
                </h2>
                <p className="text-[#666] text-sm">
                  Entre ou crie sua conta
                </p>
              </div>

              {!showEmailForm ? (
                <div className="space-y-3">
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-white text-[#1a1a1a] rounded-lg flex items-center justify-center gap-3 border border-[#e5e5e5] hover:bg-[#f5f5f5] hover:border-[#ccc] transition-all cursor-pointer disabled:opacity-50 font-medium text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continuar com Google
                  </button>

                  <button
                    onClick={handleAppleLogin}
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#1a1a1a] text-white rounded-lg flex items-center justify-center gap-3 hover:bg-[#333] transition-all cursor-pointer disabled:opacity-50 font-medium text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                    Continuar com Apple
                  </button>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#e5e5e5]"></div>
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 bg-white text-xs text-[#999]">ou</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowEmailForm(true)}
                    className="w-full py-3 px-4 bg-[#FF4F00] text-white rounded-lg flex items-center justify-center gap-3 hover:bg-[#E64500] transition-all cursor-pointer font-medium text-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Continuar com Email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center">
                      {error}
                    </div>
                  )}

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu email"
                    className="w-full py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F00] focus:border-transparent transition-all placeholder-[#999] text-[#1a1a1a] text-sm"
                    required
                  />

                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full py-3 px-4 bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4F00] focus:border-transparent transition-all placeholder-[#999] text-[#1a1a1a] text-sm"
                    required
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#FF4F00] text-white rounded-lg hover:bg-[#E64500] transition-all cursor-pointer disabled:opacity-50 font-medium text-sm"
                  >
                    {loading ? "Aguarde..." : "Continuar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmail("");
                      setPassword("");
                      setError("");
                    }}
                    className="w-full py-2 text-[#666] hover:text-[#1a1a1a] transition-colors cursor-pointer text-sm"
                  >
                    ← Voltar
                  </button>
                </form>
              )}

              <p className="text-xs text-[#999] text-center mt-6">
                Ao continuar, você concorda com nossos{" "}
                <a href="#" className="text-[#FF4F00] hover:underline">Termos</a>
                {" "}e{" "}
                <a href="#" className="text-[#FF4F00] hover:underline">Privacidade</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
