"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, buscarSaldo, buscarTransacoes, Saldo, Transacao, buscarChavesPix, salvarChavePix, removerChavePix, ChavePixSalva, buscarPreferenciaGateway, salvarPreferenciaGateway, buscarContaBancaria, salvarContaBancaria, ContaBancaria } from "@/lib/firebase";
import {
  Settings01Icon,
  Logout01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  BankIcon,
  CreditCardIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Search01Icon,
  UserIcon,
  SmartPhone01Icon,
  Mail01Icon,
  Key01Icon,
  Wallet02Icon,
  PencilEdit02Icon
} from "hugeicons-react";
import { House, Question, NotePencil, Wallet, BookmarkSimple, GearSix } from "@phosphor-icons/react";
import FooterPremium from "@/components/FooterPremium";
import toast from "react-hot-toast";

// Lista completa de bancos brasileiros
const bancosBrasileiros = [
  { codigo: '001', nome: 'Banco do Brasil S.A.' },
  { codigo: '033', nome: 'Banco Santander (Brasil) S.A.' },
  { codigo: '104', nome: 'Caixa Econômica Federal' },
  { codigo: '237', nome: 'Bradesco S.A.' },
  { codigo: '341', nome: 'Itaú Unibanco S.A.' },
  { codigo: '260', nome: 'Nu Pagamentos S.A. (Nubank)' },
  { codigo: '077', nome: 'Banco Inter S.A.' },
  { codigo: '336', nome: 'C6 Bank S.A.' },
  { codigo: '212', nome: 'Banco Original S.A.' },
  { codigo: '655', nome: 'Banco Votorantim S.A.' },
  { codigo: '745', nome: 'Banco Citibank S.A.' },
  { codigo: '422', nome: 'Banco Safra S.A.' },
  { codigo: '070', nome: 'BRB - Banco de Brasília S.A.' },
  { codigo: '756', nome: 'Bancoob - Banco Cooperativo do Brasil S.A.' },
  { codigo: '748', nome: 'Sicredi S.A.' },
  { codigo: '041', nome: 'Banrisul - Banco do Estado do RS S.A.' },
  { codigo: '004', nome: 'Banco do Nordeste do Brasil S.A.' },
  { codigo: '021', nome: 'Banestes S.A. - Banco do Estado do ES' },
  { codigo: '036', nome: 'Banco Bradesco BBI S.A.' },
  { codigo: '394', nome: 'Banco Bradesco Financiamentos S.A.' },
  { codigo: '208', nome: 'Banco BTG Pactual S.A.' },
  { codigo: '746', nome: 'Banco Modal S.A.' },
  { codigo: '389', nome: 'Banco Mercantil do Brasil S.A.' },
  { codigo: '623', nome: 'Banco Pan S.A.' },
  { codigo: '633', nome: 'Banco Rendimento S.A.' },
  { codigo: '634', nome: 'Banco Triângulo S.A.' },
  { codigo: '741', nome: 'Banco Ribeirão Preto S.A.' },
  { codigo: '743', nome: 'Banco Semear S.A.' },
  { codigo: '047', nome: 'Banco do Estado de Sergipe S.A.' },
  { codigo: '037', nome: 'Banco do Estado do Pará S.A.' },
  { codigo: '084', nome: 'Uniprime Norte do Paraná' },
  { codigo: '085', nome: 'Cooperativa Central Ailos' },
  { codigo: '099', nome: 'Uniprime Central' },
  { codigo: '133', nome: 'Cresol Confederação' },
  { codigo: '136', nome: 'Unicred Cooperativa' },
  { codigo: '323', nome: 'Mercado Pago' },
  { codigo: '290', nome: 'PagSeguro Internet S.A.' },
  { codigo: '380', nome: 'PicPay Serviços S.A.' },
  { codigo: '403', nome: 'Cora SCD S.A.' },
  { codigo: '332', nome: 'Acesso Soluções de Pagamento S.A.' },
  { codigo: '364', nome: 'Gerencianet S.A.' },
  { codigo: '383', nome: 'Juno' },
  { codigo: '401', nome: 'Stone Pagamentos S.A.' },
  { codigo: '197', nome: 'Stone Instituição de Pagamento S.A.' },
  { codigo: '274', nome: 'Money Plus SCMEPP LTDA' },
  { codigo: '280', nome: 'Avista S.A. Crédito Financiamento' },
  { codigo: '343', nome: 'FFA SCFI S.A.' },
  { codigo: '349', nome: 'Agibank S.A.' },
  { codigo: '335', nome: 'Banco Digio S.A.' },
  { codigo: '376', nome: 'Banco J.P. Morgan S.A.' },
  { codigo: '218', nome: 'Banco BS2 S.A.' },
  { codigo: '626', nome: 'Banco C6 Consignado S.A.' },
  { codigo: '630', nome: 'Banco Smartbank S.A.' },
  { codigo: '637', nome: 'Banco Sofisa S.A.' },
  { codigo: '653', nome: 'Banco Indusval S.A.' },
  { codigo: '654', nome: 'Banco Digimais S.A.' },
  { codigo: '707', nome: 'Banco Daycoval S.A.' },
  { codigo: '739', nome: 'Banco Cetelem S.A.' },
  { codigo: '752', nome: 'Banco BNP Paribas Brasil S.A.' },
  { codigo: '755', nome: 'Bank of America Merrill Lynch S.A.' },
  { codigo: '757', nome: 'Banco Keb Hana do Brasil S.A.' },
];

// Tipos de chave PIX
const tiposChavePix = [
  { tipo: 'cpf', label: 'CPF', placeholder: '000.000.000-00', icon: UserIcon },
  { tipo: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', icon: BankIcon },
  { tipo: 'email', label: 'E-mail', placeholder: 'seu@email.com', icon: Mail01Icon },
  { tipo: 'telefone', label: 'Telefone', placeholder: '+55 (00) 00000-0000', icon: SmartPhone01Icon },
  { tipo: 'aleatoria', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', icon: Key01Icon },
];


export default function Carteira() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);
  const [modalSaqueAberto, setModalSaqueAberto] = useState(false);
  const [etapaSaque, setEtapaSaque] = useState<1 | 2 | 3>(1);
  const [valorSaque, setValorSaque] = useState('');
  const [metodoSaque, setMetodoSaque] = useState<'pix' | 'ted'>('pix');

  // Estados PIX
  const [tipoChavePix, setTipoChavePix] = useState('cpf');
  const [chavePix, setChavePix] = useState('');

  // Estados para chaves PIX salvas
  const [chavesSalvas, setChavesSalvas] = useState<ChavePixSalva[]>([]);
  const [chaveSelecionadaId, setChaveSelecionadaId] = useState<string | null>(null);
  const [usarNovaChave, setUsarNovaChave] = useState(false);
  const [salvarNovaChave, setSalvarNovaChave] = useState(true);
  const [carregandoChaves, setCarregandoChaves] = useState(false);

  // Estados Transferência Bancária (TED)
  const [bancoSelecionado, setBancoSelecionado] = useState('');
  const [buscaBanco, setBuscaBanco] = useState('');
  const [dropdownBancoAberto, setDropdownBancoAberto] = useState(false);
  const [agencia, setAgencia] = useState('');
  const [numeroConta, setNumeroConta] = useState('');
  const [digitoConta, setDigitoConta] = useState('');
  const [tipoConta, setTipoConta] = useState<'corrente' | 'poupanca'>('corrente');
  const [titularNome, setTitularNome] = useState('');
  const [titularCpf, setTitularCpf] = useState('');

  // Estado de processamento
  const [processando, setProcessando] = useState(false);

  // Estado do gateway de pagamento
  const [gatewayPagamento, setGatewayPagamento] = useState<'stripe' | 'abacatepay'>('stripe');
  const [gatewaySalvo, setGatewaySalvo] = useState<'stripe' | 'abacatepay' | null>(null);

  // Estado do modal de banco
  const [modalBancoAberto, setModalBancoAberto] = useState(false);
  const [bancoRecebimento, setBancoRecebimento] = useState('');
  const [buscaBancoRecebimento, setBuscaBancoRecebimento] = useState('');
  const [dropdownBancoRecebimentoAberto, setDropdownBancoRecebimentoAberto] = useState(false);
  const [agenciaRecebimento, setAgenciaRecebimento] = useState('');
  const [contaRecebimento, setContaRecebimento] = useState('');
  const [digitoRecebimento, setDigitoRecebimento] = useState('');
  const [tipoContaRecebimento, setTipoContaRecebimento] = useState<'corrente' | 'poupanca'>('corrente');
  const [titularNomeRecebimento, setTitularNomeRecebimento] = useState('');
  const [titularCpfRecebimento, setTitularCpfRecebimento] = useState('');
  const [salvandoBanco, setSalvandoBanco] = useState(false);
  const [contaBancariaSalva, setContaBancariaSalva] = useState<ContaBancaria | null>(null);
  const [carregandoBanco, setCarregandoBanco] = useState(false);

  // Dados reais da carteira
  const [saldo, setSaldo] = useState<Saldo | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Valores do saldo
  const saldoDisponivel = saldo?.saldoDisponivel || 0;
  const totalGanho = saldo?.totalGanho || 0;
  const totalSacado = saldo?.totalSacado || 0;
  const saldoPendente = 0; // TODO: implementar saldo pendente quando necessário

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
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

  // Carregar saldo e transações
  useEffect(() => {
    const carregarDados = async () => {
      if (!user) return;
      try {
        const [saldoData, transacoesData] = await Promise.all([
          buscarSaldo(user.uid),
          buscarTransacoes(user.uid)
        ]);
        setSaldo(saldoData);
        setTransacoes(transacoesData);
      } catch (error) {
      } finally {
        setCarregando(false);
      }
    };
    if (user) {
      carregarDados();
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

  // Carregar chaves PIX salvas e preferência de gateway quando abre o modal
  useEffect(() => {
    const carregarDadosSaque = async () => {
      if (!user || !modalSaqueAberto) return;
      setCarregandoChaves(true);
      try {
        // Carregar chaves PIX e preferência de gateway em paralelo
        const [chaves, gatewayPreferido] = await Promise.all([
          buscarChavesPix(user.uid),
          buscarPreferenciaGateway(user.uid)
        ]);

        setChavesSalvas(chaves);
        // Se tiver chaves, selecionar a principal ou a primeira
        if (chaves.length > 0) {
          const principal = chaves.find(c => c.principal);
          setChaveSelecionadaId(principal?.id || chaves[0].id || null);
          setUsarNovaChave(false);
        } else {
          setUsarNovaChave(true);
        }

        // Carregar gateway preferido se existir
        if (gatewayPreferido) {
          setGatewayPagamento(gatewayPreferido);
          setGatewaySalvo(gatewayPreferido);
        }
      } catch (error) {
      } finally {
        setCarregandoChaves(false);
      }
    };
    carregarDadosSaque();
  }, [user, modalSaqueAberto]);

  // Carregar conta bancária salva quando abre o modal de banco
  useEffect(() => {
    const carregarContaBancaria = async () => {
      if (!user || !modalBancoAberto) return;
      setCarregandoBanco(true);
      try {
        const conta = await buscarContaBancaria(user.uid);
        if (conta) {
          setContaBancariaSalva(conta);
          setBancoRecebimento(conta.banco);
          setAgenciaRecebimento(conta.agencia);
          setContaRecebimento(conta.conta);
          setDigitoRecebimento(conta.digito);
          setTipoContaRecebimento(conta.tipoConta);
          setTitularNomeRecebimento(conta.titularNome);
          setTitularCpfRecebimento(conta.titularCpf);
        }
      } catch (error) {
      } finally {
        setCarregandoBanco(false);
      }
    };
    carregarContaBancaria();
  }, [user, modalBancoAberto]);

  // Filtrar bancos pela busca
  const bancosFiltrados = bancosBrasileiros.filter(banco =>
    banco.nome.toLowerCase().includes(buscaBanco.toLowerCase()) ||
    banco.codigo.includes(buscaBanco)
  );

  // Validação da etapa 1 (valor)
  const validarEtapa1 = () => {
    const valor = parseFloat(valorSaque);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Digite um valor válido");
      return false;
    }
    if (valor < 10) {
      toast.error("O valor mínimo para saque é R$ 10,00");
      return false;
    }
    if (valor > saldoDisponivel) {
      toast.error("Saldo insuficiente");
      return false;
    }
    return true;
  };

  // Validação da etapa 2 (dados bancários)
  const validarEtapa2 = () => {
    if (metodoSaque === 'pix') {
      // Se está usando chave salva, validar se uma foi selecionada
      if (!usarNovaChave) {
        if (!chaveSelecionadaId) {
          toast.error("Selecione uma chave PIX");
          return false;
        }
      } else {
        // Se está usando nova chave, validar o campo
        if (!chavePix.trim()) {
          toast.error("Digite sua chave PIX");
          return false;
        }
      }
    } else {
      if (!bancoSelecionado) {
        toast.error("Selecione um banco");
        return false;
      }
      if (!agencia.trim() || agencia.length < 4) {
        toast.error("Digite uma agência válida (mínimo 4 dígitos)");
        return false;
      }
      if (!numeroConta.trim() || numeroConta.length < 5) {
        toast.error("Digite um número de conta válido");
        return false;
      }
      if (!titularNome.trim()) {
        toast.error("Digite o nome do titular");
        return false;
      }
      if (!titularCpf.trim() || titularCpf.length < 11) {
        toast.error("Digite um CPF válido");
        return false;
      }
    }
    return true;
  };

  const avancarEtapa = () => {
    if (etapaSaque === 1 && validarEtapa1()) {
      setEtapaSaque(2);
    } else if (etapaSaque === 2 && validarEtapa2()) {
      setEtapaSaque(3);
    }
  };

  const voltarEtapa = () => {
    if (etapaSaque > 1) {
      setEtapaSaque((etapaSaque - 1) as 1 | 2 | 3);
    }
  };

  const handleSaque = async () => {
    if (!user) return;
    setProcessando(true);

    try {
      // Salvar preferência de gateway (salva sempre que fizer saque)
      if (gatewayPagamento !== gatewaySalvo) {
        await salvarPreferenciaGateway(user.uid, gatewayPagamento);
      }

      // Se está usando nova chave e marcou para salvar
      if (metodoSaque === 'pix' && usarNovaChave && salvarNovaChave && chavePix.trim()) {
        await salvarChavePix({
          usuarioId: user.uid,
          tipoChave: tipoChavePix as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria',
          chave: chavePix,
          principal: chavesSalvas.length === 0, // primeira chave é principal
        });
      }

      // Determinar a chave PIX a ser usada
      let chavePixFinal = '';
      let tipoChaveFinal = '';

      if (metodoSaque === 'pix') {
        if (!usarNovaChave && chaveSelecionadaId) {
          const chaveSelecionada = chavesSalvas.find(c => c.id === chaveSelecionadaId);
          if (chaveSelecionada) {
            chavePixFinal = chaveSelecionada.chave;
            tipoChaveFinal = chaveSelecionada.tipoChave;
          }
        } else {
          chavePixFinal = chavePix;
          tipoChaveFinal = tipoChavePix;
        }
      }

      // Chamar API de saque
      const response = await fetch('/api/saque', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuarioId: user.uid,
          valor: parseFloat(valorSaque),
          chavePix: chavePixFinal,
          tipoChave: tipoChaveFinal,
          descricao: `Saque solicitado pelo usuário`,
          gateway: gatewayPagamento
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar saque');
      }

      // Atualizar saldo local
      if (saldo) {
        setSaldo({
          ...saldo,
          saldoDisponivel: saldo.saldoDisponivel - parseFloat(valorSaque),
          totalSacado: saldo.totalSacado + parseFloat(valorSaque)
        });
      }

      toast.success(`Saque de R$ ${parseFloat(valorSaque).toFixed(2)} solicitado com sucesso!`);
      fecharModalSaque();

      // Recarregar transações
      const novasTransacoes = await buscarTransacoes(user.uid);
      setTransacoes(novasTransacoes);

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao processar saque. Tente novamente.";
      toast.error(errorMessage);
    } finally {
      setProcessando(false);
    }
  };

  const fecharModalSaque = () => {
    setModalSaqueAberto(false);
    setEtapaSaque(1);
    setValorSaque('');
    setMetodoSaque('pix');
    setTipoChavePix('cpf');
    setChavePix('');
    setChaveSelecionadaId(null);
    setUsarNovaChave(false);
    setSalvarNovaChave(true);
    setBancoSelecionado('');
    setBuscaBanco('');
    setAgencia('');
    setNumeroConta('');
    setDigitoConta('');
    setTipoConta('corrente');
    setTitularNome('');
    setTitularCpf('');
    // Reset gateway para o padrão (será carregado novamente quando abrir)
    setGatewayPagamento('stripe');
    setGatewaySalvo(null);
  };

  const getBancoNome = (codigo: string) => {
    const banco = bancosBrasileiros.find(b => b.codigo === codigo);
    return banco ? banco.nome : '';
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
          <a href="/carteira" className="flex items-center gap-3 px-4 py-2.5 text-gray-800 bg-gray-200 rounded-full cursor-pointer" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
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
              Carteira
            </h2>
            <p className="text-gray-500 mt-1" style={{ fontFamily: 'var(--font-medium)' }}>
              Gerencie seus ganhos e saques
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Botão de configurar banco */}
            <button
              onClick={() => setModalBancoAberto(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-semibold)' }}
            >
              <BankIcon size={18} className="text-gray-600" />
              <span className="text-sm text-gray-700">Conta bancária</span>
            </button>

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
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {user?.displayName || "Usuário"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.email}
                  </p>
                </div>
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
          </div>
        </header>

        {/* Conteúdo */}
        <div className="p-6 max-w-5xl">
          {/* Card principal de saldo */}
          <div className="border border-gray-200 rounded-xl p-8 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-base text-gray-500 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                  Saldo disponível
                </p>
                <p className="text-gray-900 mb-6" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '80px' }}>
                  R$ {saldoDisponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </p>
                <button
                  onClick={() => setModalSaqueAberto(true)}
                  className="px-6 py-2.5 bg-[#FF4F00] hover:bg-[#E64600] text-white rounded-full text-sm transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-semibold)' }}
                >
                  Solicitar saque
                </button>
              </div>

              {/* Mini estatísticas */}
              <div className="flex gap-12">
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'var(--font-semibold)' }}>Pendente</p>
                  <p className="text-gray-700" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '42px' }}>
                    R$ {saldoPendente.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'var(--font-semibold)' }}>Total ganho</p>
                  <p className="text-gray-700" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '42px' }}>
                    R$ {totalGanho.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400 mb-1" style={{ fontFamily: 'var(--font-semibold)' }}>Total sacado</p>
                  <p className="text-gray-700" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '42px' }}>
                    R$ {totalSacado.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Resumo em linha */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <PencilEdit02Icon size={26} className="text-gray-600" />
              </div>
              <div>
                <p className="text-gray-900" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '36px' }}>
                  {transacoes.filter(t => t.tipo === 'credito').length}
                </p>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-semibold)' }}>Respostas aceitas</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <Wallet02Icon size={26} className="text-gray-600" />
              </div>
              <div>
                <p className="text-gray-900" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '36px' }}>
                  {transacoes.filter(t => t.tipo === 'credito').length > 0
                    ? `R$ ${(totalGanho / transacoes.filter(t => t.tipo === 'credito').length).toFixed(2)}`
                    : 'R$ 0,00'}
                </p>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-semibold)' }}>Média por resposta</p>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
                <ArrowDown01Icon size={26} className="text-gray-600" />
              </div>
              <div>
                <p className="text-gray-900" style={{ fontFamily: 'var(--font-black)', fontWeight: 900, fontSize: '36px' }}>
                  {transacoes.filter(t => t.tipo === 'debito').length}
                </p>
                <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-semibold)' }}>Saques realizados</p>
              </div>
            </div>
          </div>

          {/* Histórico de Transações */}
          <div className="border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-base text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                Histórico de transações
              </h3>
            </div>

            <div>
              {carregando ? (
                <div className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Carregando...</p>
                </div>
              ) : transacoes.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Wallet02Icon size={32} className="mx-auto mb-2" />
                  <p className="text-sm">Nenhuma transação ainda</p>
                </div>
              ) : (
                transacoes.slice(0, 8).map((transacao, index) => {
                  const isCredito = transacao.tipo === 'credito';
                  const dataFormatada = transacao.criadoEm?.toDate
                    ? transacao.criadoEm.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : new Date(transacao.criadoEm as any).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                  return (
                    <div key={index} className={`flex items-center gap-4 px-4 py-3 ${index !== transacoes.slice(0, 8).length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCredito ? 'bg-green-50' : 'bg-gray-100'
                      }`}>
                        {isCredito ? (
                          <ArrowUp01Icon size={16} className="text-green-600" />
                        ) : (
                          <ArrowDown01Icon size={16} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate" style={{ fontFamily: 'var(--font-semibold)' }}>
                          {transacao.descricao}
                        </p>
                        <p className="text-sm text-gray-400">{dataFormatada}</p>
                      </div>
                      <p className={`${isCredito ? 'text-green-600' : 'text-gray-500'}`} style={{ fontFamily: 'var(--font-black)', fontWeight: 800, fontSize: '24px' }}>
                        {isCredito ? '+' : '-'} R$ {transacao.valor.toFixed(2)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Saque */}
      {modalSaqueAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                  Solicitar Saque
                </h3>
                <p className="text-sm text-gray-500">Etapa {etapaSaque} de 3</p>
              </div>
              <button
                onClick={fecharModalSaque}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <Cancel01Icon size={24} />
              </button>
            </div>

            {/* Indicador de etapas */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex-1 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      step < etapaSaque ? 'bg-green-500 text-white' :
                      step === etapaSaque ? 'bg-blue-500 text-white' :
                      'bg-gray-200 text-gray-500'
                    }`} style={{ fontFamily: 'var(--font-semibold)' }}>
                      {step < etapaSaque ? <CheckmarkCircle02Icon size={18} /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`flex-1 h-1 rounded ${step < etapaSaque ? 'bg-green-500' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">Valor</span>
                <span className="text-xs text-gray-500">Dados</span>
                <span className="text-xs text-gray-500">Confirmar</span>
              </div>
            </div>

            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ETAPA 1: Valor do saque */}
              {etapaSaque === 1 && (
                <div>
                  {/* Saldo disponível */}
                  <div className="bg-green-50 rounded-xl p-4 mb-6">
                    <p className="text-sm text-green-600 mb-1" style={{ fontFamily: 'var(--font-medium)' }}>
                      Saldo disponível para saque
                    </p>
                    <p className="text-2xl text-green-700" style={{ fontFamily: 'var(--font-bold)' }}>
                      R$ {saldoDisponivel.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </p>
                  </div>

                  {/* Valor do saque */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                      Quanto você quer sacar?
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl">R$</span>
                      <input
                        type="number"
                        value={valorSaque}
                        onChange={(e) => setValorSaque(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-14 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-2xl"
                        style={{ fontFamily: 'var(--font-bold)' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">Valor mínimo: R$ 10,00</p>
                      <p className="text-xs text-gray-500">Taxa: 9,98%</p>
                    </div>
                    {valorSaque && parseFloat(valorSaque) >= 10 && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">
                          Você receberá: <span style={{ fontFamily: 'var(--font-bold)' }}>R$ {(parseFloat(valorSaque) * 0.9002).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Valores rápidos */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                      Valores rápidos
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {[50, 100, 200, saldoDisponivel].map((valor) => (
                        <button
                          key={valor}
                          onClick={() => setValorSaque(valor.toString())}
                          className={`py-2 px-3 rounded-lg border transition-colors cursor-pointer text-sm ${
                            valorSaque === valor.toString()
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          }`}
                          style={{ fontFamily: 'var(--font-medium)' }}
                        >
                          {valor === saldoDisponivel ? 'Tudo' : `R$ ${valor}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ETAPA 2: Dados bancários */}
              {etapaSaque === 2 && (
                <div>
                  {/* Gateway de pagamento */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-600 mb-3" style={{ fontFamily: 'var(--font-medium)' }}>
                      Processador de pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setGatewayPagamento('stripe')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                          gatewayPagamento === 'stripe'
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gatewayPagamento === 'stripe' ? 'bg-purple-100' : 'bg-gray-100'}`}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.534 0 3.125.622 4.205 1.12l.613-3.769c-.906-.427-2.581-1.022-4.818-1.022-1.534 0-2.819.391-3.725 1.11-.942.746-1.436 1.836-1.436 3.116 0 2.332 1.436 3.358 3.738 4.179 1.514.533 2.058 1.067 2.058 1.836 0 .711-.587 1.156-1.654 1.156-1.253 0-3.335-.551-4.681-1.315l-.64 3.858c1.022.516 3.069 1.067 5.137 1.067 1.618 0 2.999-.391 3.949-1.138.992-.782 1.52-1.933 1.52-3.374 0-2.436-1.472-3.446-3.177-4.044z" fill={gatewayPagamento === 'stripe' ? '#7C3AED' : '#6B7280'}/>
                          </svg>
                        </div>
                        <span className={gatewayPagamento === 'stripe' ? 'text-purple-700' : 'text-gray-600'} style={{ fontFamily: 'var(--font-semibold)' }}>
                          Stripe
                        </span>
                        <span className="text-xs text-gray-500 text-center">Cartão internacional</span>
                      </button>
                      <button
                        onClick={() => setGatewayPagamento('abacatepay')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                          gatewayPagamento === 'abacatepay'
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${gatewayPagamento === 'abacatepay' ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <span className="text-xl">{gatewayPagamento === 'abacatepay' ? '🥑' : '🥑'}</span>
                        </div>
                        <span className={gatewayPagamento === 'abacatepay' ? 'text-green-700' : 'text-gray-600'} style={{ fontFamily: 'var(--font-semibold)' }}>
                          AbacatePay
                        </span>
                        <span className="text-xs text-gray-500 text-center">PIX e boleto Brasil</span>
                      </button>
                    </div>
                    {gatewaySalvo && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <CheckmarkCircle02Icon size={14} className="text-green-500" />
                        Gateway preferido salvo: {gatewaySalvo === 'stripe' ? 'Stripe' : 'AbacatePay'}
                      </p>
                    )}
                  </div>

                  {/* Método de saque */}
                  <div className="mb-6">
                    <label className="block text-sm text-gray-600 mb-3" style={{ fontFamily: 'var(--font-medium)' }}>
                      Como você quer receber?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMetodoSaque('pix')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                          metodoSaque === 'pix'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCardIcon size={28} className={metodoSaque === 'pix' ? 'text-blue-500' : 'text-gray-400'} />
                        <span className={metodoSaque === 'pix' ? 'text-blue-700' : 'text-gray-600'} style={{ fontFamily: 'var(--font-semibold)' }}>
                          PIX
                        </span>
                        <span className="text-xs text-gray-500">Instantâneo</span>
                      </button>
                      <button
                        onClick={() => setMetodoSaque('ted')}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                          metodoSaque === 'ted'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <BankIcon size={28} className={metodoSaque === 'ted' ? 'text-blue-500' : 'text-gray-400'} />
                        <span className={metodoSaque === 'ted' ? 'text-blue-700' : 'text-gray-600'} style={{ fontFamily: 'var(--font-semibold)' }}>
                          TED
                        </span>
                        <span className="text-xs text-gray-500">1 dia útil</span>
                      </button>
                    </div>
                  </div>

                  {/* Campos PIX */}
                  {metodoSaque === 'pix' && (
                    <div>
                      {carregandoChaves ? (
                        <div className="text-center py-8">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Carregando chaves salvas...</p>
                        </div>
                      ) : (
                        <>
                          {/* Chaves salvas */}
                          {chavesSalvas.length > 0 && !usarNovaChave && (
                            <div className="mb-4">
                              <label className="block text-sm text-gray-600 mb-3" style={{ fontFamily: 'var(--font-medium)' }}>
                                Suas chaves PIX salvas
                              </label>
                              <div className="space-y-2">
                                {chavesSalvas.map((chave) => {
                                  const tipoInfo = tiposChavePix.find(t => t.tipo === chave.tipoChave);
                                  const IconComponent = tipoInfo?.icon || Key01Icon;
                                  return (
                                    <button
                                      key={chave.id}
                                      onClick={() => setChaveSelecionadaId(chave.id || null)}
                                      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-colors cursor-pointer ${
                                        chaveSelecionadaId === chave.id
                                          ? 'border-blue-500 bg-blue-50'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        chaveSelecionadaId === chave.id ? 'bg-blue-100' : 'bg-gray-100'
                                      }`}>
                                        <IconComponent size={20} className={chaveSelecionadaId === chave.id ? 'text-blue-500' : 'text-gray-500'} />
                                      </div>
                                      <div className="flex-1 text-left">
                                        <p className={`text-sm ${chaveSelecionadaId === chave.id ? 'text-blue-700' : 'text-gray-800'}`} style={{ fontFamily: 'var(--font-semibold)' }}>
                                          {chave.apelido || tipoInfo?.label || 'Chave PIX'}
                                          {chave.principal && (
                                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Principal</span>
                                          )}
                                        </p>
                                        <p className="text-sm text-gray-500">{chave.chave}</p>
                                      </div>
                                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        chaveSelecionadaId === chave.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                      }`}>
                                        {chaveSelecionadaId === chave.id && (
                                          <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Botão para usar outra chave */}
                              <button
                                onClick={() => setUsarNovaChave(true)}
                                className="w-full mt-3 py-3 text-blue-600 text-sm hover:bg-blue-50 rounded-xl transition-colors cursor-pointer border border-dashed border-blue-300"
                                style={{ fontFamily: 'var(--font-medium)' }}
                              >
                                + Usar outra chave PIX
                              </button>
                            </div>
                          )}

                          {/* Formulário de nova chave */}
                          {(usarNovaChave || chavesSalvas.length === 0) && (
                            <div>
                              {/* Botão voltar para chaves salvas */}
                              {chavesSalvas.length > 0 && (
                                <button
                                  onClick={() => setUsarNovaChave(false)}
                                  className="mb-4 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
                                  style={{ fontFamily: 'var(--font-medium)' }}
                                >
                                  ← Voltar para chaves salvas
                                </button>
                              )}

                              {/* Tipo de chave PIX */}
                              <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                                  Tipo de chave
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                  {tiposChavePix.map((tipo) => {
                                    const IconComponent = tipo.icon;
                                    return (
                                      <button
                                        key={tipo.tipo}
                                        onClick={() => {
                                          setTipoChavePix(tipo.tipo);
                                          setChavePix('');
                                        }}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors cursor-pointer ${
                                          tipoChavePix === tipo.tipo
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        <IconComponent size={20} className={tipoChavePix === tipo.tipo ? 'text-blue-500' : 'text-gray-400'} />
                                        <span className={`text-xs ${tipoChavePix === tipo.tipo ? 'text-blue-700' : 'text-gray-600'}`} style={{ fontFamily: 'var(--font-medium)' }}>
                                          {tipo.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Input da chave PIX */}
                              <div className="mb-4">
                                <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                                  Chave PIX
                                </label>
                                <input
                                  type="text"
                                  value={chavePix}
                                  onChange={(e) => setChavePix(e.target.value)}
                                  placeholder={tiposChavePix.find(t => t.tipo === tipoChavePix)?.placeholder}
                                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                                  style={{ fontFamily: 'var(--font-medium)' }}
                                />
                              </div>

                              {/* Checkbox salvar chave */}
                              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={salvarNovaChave}
                                  onChange={(e) => setSalvarNovaChave(e.target.checked)}
                                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 cursor-pointer"
                                />
                                <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-medium)' }}>
                                  Salvar esta chave para próximos saques
                                </span>
                              </label>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Campos TED */}
                  {metodoSaque === 'ted' && (
                    <div>
                      {/* Seleção de banco */}
                      <div className="mb-4 relative">
                        <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                          Banco
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <Search01Icon size={18} className="text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={buscaBanco}
                            onChange={(e) => {
                              setBuscaBanco(e.target.value);
                              setDropdownBancoAberto(true);
                            }}
                            onFocus={() => setDropdownBancoAberto(true)}
                            placeholder="Buscar banco por nome ou código"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            style={{ fontFamily: 'var(--font-medium)' }}
                          />
                        </div>
                        {bancoSelecionado && !dropdownBancoAberto && (
                          <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                            <span className="text-sm text-blue-700" style={{ fontFamily: 'var(--font-medium)' }}>
                              {getBancoNome(bancoSelecionado)} ({bancoSelecionado})
                            </span>
                            <button
                              onClick={() => {
                                setBancoSelecionado('');
                                setBuscaBanco('');
                              }}
                              className="text-blue-500 hover:text-blue-700"
                            >
                              <Cancel01Icon size={16} />
                            </button>
                          </div>
                        )}
                        {dropdownBancoAberto && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {bancosFiltrados.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-gray-500">Nenhum banco encontrado</div>
                            ) : (
                              bancosFiltrados.slice(0, 10).map((banco) => (
                                <button
                                  key={banco.codigo}
                                  onClick={() => {
                                    setBancoSelecionado(banco.codigo);
                                    setBuscaBanco('');
                                    setDropdownBancoAberto(false);
                                  }}
                                  className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 cursor-pointer border-b border-gray-100 last:border-0"
                                >
                                  <span className="text-xs text-gray-400 w-10">{banco.codigo}</span>
                                  <span className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-medium)' }}>
                                    {banco.nome}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      {/* Agência e Conta */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                            Agência
                          </label>
                          <input
                            type="text"
                            value={agencia}
                            onChange={(e) => setAgencia(e.target.value.replace(/\D/g, ''))}
                            placeholder="0000"
                            maxLength={4}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            style={{ fontFamily: 'var(--font-medium)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                            Conta
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={numeroConta}
                              onChange={(e) => setNumeroConta(e.target.value.replace(/\D/g, ''))}
                              placeholder="00000000"
                              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                              style={{ fontFamily: 'var(--font-medium)' }}
                            />
                            <input
                              type="text"
                              value={digitoConta}
                              onChange={(e) => setDigitoConta(e.target.value.replace(/\D/g, ''))}
                              placeholder="0"
                              maxLength={1}
                              className="w-14 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-center"
                              style={{ fontFamily: 'var(--font-medium)' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tipo de conta */}
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                          Tipo de conta
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setTipoConta('corrente')}
                            className={`py-3 px-4 rounded-xl border-2 transition-colors cursor-pointer ${
                              tipoConta === 'corrente'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                            style={{ fontFamily: 'var(--font-medium)' }}
                          >
                            Conta Corrente
                          </button>
                          <button
                            onClick={() => setTipoConta('poupanca')}
                            className={`py-3 px-4 rounded-xl border-2 transition-colors cursor-pointer ${
                              tipoConta === 'poupanca'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                            }`}
                            style={{ fontFamily: 'var(--font-medium)' }}
                          >
                            Poupança
                          </button>
                        </div>
                      </div>

                      {/* Dados do titular */}
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                          Nome do titular
                        </label>
                        <input
                          type="text"
                          value={titularNome}
                          onChange={(e) => setTitularNome(e.target.value)}
                          placeholder="Nome completo"
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          style={{ fontFamily: 'var(--font-medium)' }}
                        />
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-2" style={{ fontFamily: 'var(--font-medium)' }}>
                          CPF do titular
                        </label>
                        <input
                          type="text"
                          value={titularCpf}
                          onChange={(e) => setTitularCpf(e.target.value.replace(/\D/g, ''))}
                          placeholder="000.000.000-00"
                          maxLength={11}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          style={{ fontFamily: 'var(--font-medium)' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ETAPA 3: Confirmação */}
              {etapaSaque === 3 && (
                <div>
                  {/* Resumo do valor com taxa */}
                  <div className="bg-gray-50 rounded-xl p-5 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600" style={{ fontFamily: 'var(--font-medium)' }}>Valor solicitado</span>
                      <span className="text-gray-900" style={{ fontFamily: 'var(--font-semibold)' }}>
                        R$ {parseFloat(valorSaque).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-600" style={{ fontFamily: 'var(--font-medium)' }}>Taxa QuestionGo (9,98%)</span>
                      <span className="text-red-500" style={{ fontFamily: 'var(--font-semibold)' }}>
                        - R$ {(parseFloat(valorSaque) * 0.0998).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>Você receberá</span>
                        <span className="text-green-600 text-xl" style={{ fontFamily: 'var(--font-black)' }}>
                          R$ {(parseFloat(valorSaque) * (1 - 0.0998)).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <h4 className="text-sm text-gray-500 mb-3" style={{ fontFamily: 'var(--font-semibold)' }}>
                      Dados do recebimento
                    </h4>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Processador</span>
                        <span className={`text-sm flex items-center gap-2 ${gatewayPagamento === 'stripe' ? 'text-purple-700' : 'text-green-700'}`} style={{ fontFamily: 'var(--font-medium)' }}>
                          {gatewayPagamento === 'stripe' ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M13.479 9.883c-1.626-.604-2.512-1.067-2.512-1.803 0-.622.511-.977 1.423-.977 1.534 0 3.125.622 4.205 1.12l.613-3.769c-.906-.427-2.581-1.022-4.818-1.022-1.534 0-2.819.391-3.725 1.11-.942.746-1.436 1.836-1.436 3.116 0 2.332 1.436 3.358 3.738 4.179 1.514.533 2.058 1.067 2.058 1.836 0 .711-.587 1.156-1.654 1.156-1.253 0-3.335-.551-4.681-1.315l-.64 3.858c1.022.516 3.069 1.067 5.137 1.067 1.618 0 2.999-.391 3.949-1.138.992-.782 1.52-1.933 1.52-3.374 0-2.436-1.472-3.446-3.177-4.044z" fill="#7C3AED"/>
                              </svg>
                              Stripe
                            </>
                          ) : (
                            <>
                              <span>🥑</span>
                              AbacatePay
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Método</span>
                        <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                          {metodoSaque === 'pix' ? 'PIX' : 'TED'}
                        </span>
                      </div>

                      {metodoSaque === 'pix' ? (
                        (() => {
                          const chaveSelecionada = !usarNovaChave && chaveSelecionadaId
                            ? chavesSalvas.find(c => c.id === chaveSelecionadaId)
                            : null;
                          const tipoChaveExibir = chaveSelecionada ? chaveSelecionada.tipoChave : tipoChavePix;
                          const chaveExibir = chaveSelecionada ? chaveSelecionada.chave : chavePix;
                          return (
                            <>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Tipo de chave</span>
                                <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                                  {tiposChavePix.find(t => t.tipo === tipoChaveExibir)?.label}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-500">Chave PIX</span>
                                <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                                  {chaveExibir}
                                </span>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Banco</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {getBancoNome(bancoSelecionado)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Agência</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {agencia}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Conta</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {numeroConta}-{digitoConta}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Tipo</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {tipoConta === 'corrente' ? 'Conta Corrente' : 'Poupança'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Titular</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {titularNome}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">CPF</span>
                            <span className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                              {titularCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-sm text-yellow-700" style={{ fontFamily: 'var(--font-medium)' }}>
                      {metodoSaque === 'pix'
                        ? 'Transferências via PIX são processadas em até 24 horas úteis.'
                        : 'Transferências via TED são processadas em até 1 dia útil.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={etapaSaque === 1 ? fecharModalSaque : voltarEtapa}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-medium)' }}
              >
                {etapaSaque === 1 ? 'Cancelar' : 'Voltar'}
              </button>

              {etapaSaque < 3 ? (
                <button
                  onClick={avancarEtapa}
                  className="px-6 py-2.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-semibold)' }}
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={handleSaque}
                  disabled={processando}
                  className="px-6 py-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-semibold)' }}
                >
                  {processando ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar Saque'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conta Bancária - Full Screen */}
      {modalBancoAberto && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setModalBancoAberto(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <Cancel01Icon size={24} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                  Conta Bancária
                </h1>
                <p className="text-gray-500 text-sm">Configure sua conta para receber saques</p>
              </div>
            </div>
            {contaBancariaSalva && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full">
                <CheckmarkCircle02Icon size={18} className="text-green-600" />
                <span className="text-sm text-green-700" style={{ fontFamily: 'var(--font-medium)' }}>Conta salva</span>
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-8 py-10">
              {carregandoBanco ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500">Carregando dados bancários...</p>
                </div>
              ) : (
                <>
                  {/* Ícone e título da seção */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                      <BankIcon size={32} className="text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-xl text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                        Dados da conta
                      </h2>
                      <p className="text-gray-500">Preencha os dados da sua conta bancária</p>
                    </div>
                  </div>

                  {/* Formulário */}
                  <div className="space-y-6">
                    {/* Seleção de banco */}
                    <div className="relative">
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                        Banco *
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                          <Search01Icon size={20} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={buscaBancoRecebimento}
                          onChange={(e) => {
                            setBuscaBancoRecebimento(e.target.value);
                            setDropdownBancoRecebimentoAberto(true);
                          }}
                          onFocus={() => setDropdownBancoRecebimentoAberto(true)}
                          placeholder="Buscar banco por nome ou código"
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
                          style={{ fontFamily: 'var(--font-medium)' }}
                        />
                      </div>
                      {bancoRecebimento && !dropdownBancoRecebimentoAberto && (
                        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <BankIcon size={20} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-blue-800" style={{ fontFamily: 'var(--font-semibold)' }}>
                                {getBancoNome(bancoRecebimento)}
                              </p>
                              <p className="text-sm text-blue-600">Código: {bancoRecebimento}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setBancoRecebimento('');
                              setBuscaBancoRecebimento('');
                            }}
                            className="p-2 hover:bg-blue-100 rounded-full transition-colors cursor-pointer"
                          >
                            <Cancel01Icon size={18} className="text-blue-500" />
                          </button>
                        </div>
                      )}
                      {dropdownBancoRecebimentoAberto && (
                        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto">
                          {bancosBrasileiros.filter(banco =>
                            banco.nome.toLowerCase().includes(buscaBancoRecebimento.toLowerCase()) ||
                            banco.codigo.includes(buscaBancoRecebimento)
                          ).length === 0 ? (
                            <div className="px-6 py-4 text-gray-500">Nenhum banco encontrado</div>
                          ) : (
                            bancosBrasileiros.filter(banco =>
                              banco.nome.toLowerCase().includes(buscaBancoRecebimento.toLowerCase()) ||
                              banco.codigo.includes(buscaBancoRecebimento)
                            ).slice(0, 10).map((banco) => (
                              <button
                                key={banco.codigo}
                                onClick={() => {
                                  setBancoRecebimento(banco.codigo);
                                  setBuscaBancoRecebimento('');
                                  setDropdownBancoRecebimentoAberto(false);
                                }}
                                className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center gap-4 cursor-pointer border-b border-gray-100 last:border-0 transition-colors"
                              >
                                <span className="text-sm text-gray-400 w-12 shrink-0">{banco.codigo}</span>
                                <span className="text-gray-800" style={{ fontFamily: 'var(--font-medium)' }}>
                                  {banco.nome}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Agência e Conta */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                          Agência *
                        </label>
                        <input
                          type="text"
                          value={agenciaRecebimento}
                          onChange={(e) => setAgenciaRecebimento(e.target.value.replace(/\D/g, ''))}
                          placeholder="0000"
                          maxLength={4}
                          className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
                          style={{ fontFamily: 'var(--font-medium)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                          Conta *
                        </label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={contaRecebimento}
                            onChange={(e) => setContaRecebimento(e.target.value.replace(/\D/g, ''))}
                            placeholder="00000000"
                            className="flex-1 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
                            style={{ fontFamily: 'var(--font-medium)' }}
                          />
                          <input
                            type="text"
                            value={digitoRecebimento}
                            onChange={(e) => setDigitoRecebimento(e.target.value.replace(/\D/g, ''))}
                            placeholder="0"
                            maxLength={1}
                            className="w-16 px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg text-center"
                            style={{ fontFamily: 'var(--font-medium)' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Tipo de conta */}
                    <div>
                      <label className="block text-sm text-gray-700 mb-3" style={{ fontFamily: 'var(--font-semibold)' }}>
                        Tipo de conta *
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setTipoContaRecebimento('corrente')}
                          className={`py-4 px-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center gap-3 ${
                            tipoContaRecebimento === 'corrente'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'var(--font-semibold)' }}
                        >
                          <CreditCardIcon size={22} className={tipoContaRecebimento === 'corrente' ? 'text-blue-500' : 'text-gray-400'} />
                          Conta Corrente
                        </button>
                        <button
                          onClick={() => setTipoContaRecebimento('poupanca')}
                          className={`py-4 px-6 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center gap-3 ${
                            tipoContaRecebimento === 'poupanca'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                          }`}
                          style={{ fontFamily: 'var(--font-semibold)' }}
                        >
                          <Wallet02Icon size={22} className={tipoContaRecebimento === 'poupanca' ? 'text-blue-500' : 'text-gray-400'} />
                          Poupança
                        </button>
                      </div>
                    </div>

                    {/* Separador */}
                    <div className="border-t border-gray-200 my-8" />

                    {/* Dados do titular */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                        <UserIcon size={24} className="text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                          Dados do titular
                        </h3>
                        <p className="text-sm text-gray-500">Informe os dados do titular da conta</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                        Nome completo *
                      </label>
                      <input
                        type="text"
                        value={titularNomeRecebimento}
                        onChange={(e) => setTitularNomeRecebimento(e.target.value)}
                        placeholder="Digite o nome completo do titular"
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
                        style={{ fontFamily: 'var(--font-medium)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                        CPF *
                      </label>
                      <input
                        type="text"
                        value={titularCpfRecebimento}
                        onChange={(e) => setTitularCpfRecebimento(e.target.value.replace(/\D/g, ''))}
                        placeholder="000.000.000-00"
                        maxLength={11}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-lg"
                        style={{ fontFamily: 'var(--font-medium)' }}
                      />
                    </div>

                    {/* Aviso */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                        <Clock01Icon size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-amber-800" style={{ fontFamily: 'var(--font-semibold)' }}>
                          Importante
                        </p>
                        <p className="text-sm text-amber-700 mt-1">
                          Esta conta será usada para receber todos os seus saques. Certifique-se de que os dados estão corretos para evitar problemas nas transferências.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer fixo */}
          <div className="border-t border-gray-200 bg-white px-8 py-6">
            <div className="max-w-2xl mx-auto flex items-center justify-between">
              <button
                onClick={() => setModalBancoAberto(false)}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-semibold)' }}
              >
                Cancelar
              </button>

              <button
                onClick={async () => {
                  if (!user) return;
                  if (!bancoRecebimento) {
                    toast.error('Selecione um banco');
                    return;
                  }
                  if (!agenciaRecebimento || agenciaRecebimento.length < 4) {
                    toast.error('Digite uma agência válida (mínimo 4 dígitos)');
                    return;
                  }
                  if (!contaRecebimento || contaRecebimento.length < 5) {
                    toast.error('Digite um número de conta válido');
                    return;
                  }
                  if (!titularNomeRecebimento.trim()) {
                    toast.error('Digite o nome do titular');
                    return;
                  }
                  if (!titularCpfRecebimento || titularCpfRecebimento.length < 11) {
                    toast.error('Digite um CPF válido');
                    return;
                  }

                  setSalvandoBanco(true);
                  try {
                    await salvarContaBancaria({
                      usuarioId: user.uid,
                      banco: bancoRecebimento,
                      bancoNome: getBancoNome(bancoRecebimento),
                      agencia: agenciaRecebimento,
                      conta: contaRecebimento,
                      digito: digitoRecebimento,
                      tipoConta: tipoContaRecebimento,
                      titularNome: titularNomeRecebimento,
                      titularCpf: titularCpfRecebimento
                    });
                    setContaBancariaSalva({
                      usuarioId: user.uid,
                      banco: bancoRecebimento,
                      bancoNome: getBancoNome(bancoRecebimento),
                      agencia: agenciaRecebimento,
                      conta: contaRecebimento,
                      digito: digitoRecebimento,
                      tipoConta: tipoContaRecebimento,
                      titularNome: titularNomeRecebimento,
                      titularCpf: titularCpfRecebimento,
                      atualizadoEm: {} as any
                    });
                    toast.success('Conta bancária salva com sucesso!');
                    setModalBancoAberto(false);
                  } catch {
                    toast.error('Erro ao salvar dados bancários. Tente novamente.');
                  } finally {
                    setSalvandoBanco(false);
                  }
                }}
                disabled={salvandoBanco || carregandoBanco}
                className="px-8 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
                style={{ fontFamily: 'var(--font-semibold)' }}
              >
                {salvandoBanco ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckmarkCircle02Icon size={22} />
                    Salvar conta bancária
                  </>
                )}
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
