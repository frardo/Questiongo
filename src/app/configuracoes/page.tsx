"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  auth,
  atualizarFotoPerfil,
  uploadArquivo,
  buscarChavesPix,
  salvarChavePix,
  removerChavePix,
  ChavePixSalva,
  buscarContaBancaria,
  salvarContaBancaria,
  ContaBancaria,
  buscarPreferenciaGateway,
  salvarPreferenciaGateway,
} from "@/lib/firebase";
import {
  Settings01Icon,
  Logout01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  UserIcon,
  SmartPhone01Icon,
  Mail01Icon,
  Key01Icon,
  BankIcon,
  CreditCardIcon,
  Search01Icon,
  Camera01Icon,
  Delete02Icon,
} from "hugeicons-react";
import { House, Question, NotePencil, Wallet, GearSix } from "@phosphor-icons/react";
import FooterPremium from "@/components/FooterPremium";
import toast from "react-hot-toast";

// Lista de bancos brasileiros
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
  { codigo: '208', nome: 'Banco BTG Pactual S.A.' },
  { codigo: '623', nome: 'Banco Pan S.A.' },
  { codigo: '323', nome: 'Mercado Pago' },
  { codigo: '290', nome: 'PagSeguro Internet S.A.' },
  { codigo: '380', nome: 'PicPay Serviços S.A.' },
  { codigo: '403', nome: 'Cora SCD S.A.' },
  { codigo: '401', nome: 'Stone Pagamentos S.A.' },
  { codigo: '349', nome: 'Agibank S.A.' },
  { codigo: '335', nome: 'Banco Digio S.A.' },
  { codigo: '218', nome: 'Banco BS2 S.A.' },
  { codigo: '707', nome: 'Banco Daycoval S.A.' },
];

// Tipos de chave PIX
const tiposChavePix = [
  { tipo: 'cpf', label: 'CPF', placeholder: '000.000.000-00', icon: UserIcon },
  { tipo: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', icon: BankIcon },
  { tipo: 'email', label: 'E-mail', placeholder: 'seu@email.com', icon: Mail01Icon },
  { tipo: 'telefone', label: 'Telefone', placeholder: '+55 (00) 00000-0000', icon: SmartPhone01Icon },
  { tipo: 'aleatoria', label: 'Chave Aleatória', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', icon: Key01Icon },
];

export default function Configuracoes() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [perfilMenuAberto, setPerfilMenuAberto] = useState(false);

  // Perfil
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chaves PIX
  const [chavesSalvas, setChavesSalvas] = useState<ChavePixSalva[]>([]);
  const [carregandoChaves, setCarregandoChaves] = useState(true);
  const [novaChaveTipo, setNovaChaveTipo] = useState('cpf');
  const [novaChaveValor, setNovaChaveValor] = useState('');
  const [salvandoChave, setSalvandoChave] = useState(false);
  const [removendoChaveId, setRemovendoChaveId] = useState<string | null>(null);

  // Conta Bancária
  const [contaBancaria, setContaBancaria] = useState<ContaBancaria | null>(null);
  const [carregandoBanco, setCarregandoBanco] = useState(true);
  const [bancoSelecionado, setBancoSelecionado] = useState('');
  const [buscaBanco, setBuscaBanco] = useState('');
  const [dropdownBancoAberto, setDropdownBancoAberto] = useState(false);
  const [agencia, setAgencia] = useState('');
  const [conta, setConta] = useState('');
  const [digito, setDigito] = useState('');
  const [tipoConta, setTipoConta] = useState<'corrente' | 'poupanca'>('corrente');
  const [titularNome, setTitularNome] = useState('');
  const [titularCpf, setTitularCpf] = useState('');
  const [salvandoBanco, setSalvandoBanco] = useState(false);

  // Gateway
  const [gatewayPreferido, setGatewayPreferido] = useState<'abacatepay' | null>(null);
  const [carregandoGateway, setCarregandoGateway] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
    }
  };

  // Auth guard
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

  // Carregar dados
  useEffect(() => {
    const carregar = async () => {
      if (!user) return;
      try {
        const [chaves, banco, gateway] = await Promise.all([
          buscarChavesPix(user.uid),
          buscarContaBancaria(user.uid),
          buscarPreferenciaGateway(user.uid),
        ]);
        setChavesSalvas(chaves);
        if (banco) {
          setContaBancaria(banco);
          setBancoSelecionado(banco.banco);
          setAgencia(banco.agencia);
          setConta(banco.conta);
          setDigito(banco.digito);
          setTipoConta(banco.tipoConta);
          setTitularNome(banco.titularNome);
          setTitularCpf(banco.titularCpf);
        }
        if (gateway) {
          setGatewayPreferido(gateway === 'abacatepay' ? 'abacatepay' : 'abacatepay');
        }
      } catch (error) {
      } finally {
        setCarregandoChaves(false);
        setCarregandoBanco(false);
        setCarregandoGateway(false);
      }
    };
    if (user) carregar();
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

  const getBancoNome = (codigo: string) => {
    const banco = bancosBrasileiros.find(b => b.codigo === codigo);
    return banco ? banco.nome : '';
  };

  // Upload de foto
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !user) return;

    if (!arquivo.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande. Máximo: 5MB');
      return;
    }

    setUploadingFoto(true);
    try {
      const url = await uploadArquivo(arquivo, 'perfil');
      await atualizarFotoPerfil(url);
      toast.success('Foto atualizada com sucesso!');
      // Forçar reload do user para atualizar a foto
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao atualizar foto');
    } finally {
      setUploadingFoto(false);
    }
  };

  // Adicionar chave PIX
  const handleAdicionarChave = async () => {
    if (!user || !novaChaveValor.trim()) {
      toast.error('Digite a chave PIX');
      return;
    }
    setSalvandoChave(true);
    try {
      await salvarChavePix({
        usuarioId: user.uid,
        tipoChave: novaChaveTipo as 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria',
        chave: novaChaveValor,
        principal: chavesSalvas.length === 0,
      });
      const chaves = await buscarChavesPix(user.uid);
      setChavesSalvas(chaves);
      setNovaChaveValor('');
      toast.success('Chave PIX salva!');
    } catch (error) {
      toast.error('Erro ao salvar chave PIX');
    } finally {
      setSalvandoChave(false);
    }
  };

  // Remover chave PIX
  const handleRemoverChave = async (chaveId: string) => {
    setRemovendoChaveId(chaveId);
    try {
      await removerChavePix(chaveId);
      setChavesSalvas(prev => prev.filter(c => c.id !== chaveId));
      toast.success('Chave removida');
    } catch (error) {
      toast.error('Erro ao remover chave');
    } finally {
      setRemovendoChaveId(null);
    }
  };

  // Salvar conta bancária
  const handleSalvarBanco = async () => {
    if (!user) return;
    if (!bancoSelecionado) { toast.error('Selecione um banco'); return; }
    if (!agencia || agencia.length < 4) { toast.error('Agência inválida (mínimo 4 dígitos)'); return; }
    if (!conta || conta.length < 5) { toast.error('Conta inválida'); return; }
    if (!titularNome.trim()) { toast.error('Informe o nome do titular'); return; }
    if (!titularCpf || titularCpf.length < 11) { toast.error('CPF inválido'); return; }

    setSalvandoBanco(true);
    try {
      await salvarContaBancaria({
        usuarioId: user.uid,
        banco: bancoSelecionado,
        bancoNome: getBancoNome(bancoSelecionado),
        agencia,
        conta,
        digito,
        tipoConta,
        titularNome,
        titularCpf,
      });
      setContaBancaria({
        usuarioId: user.uid,
        banco: bancoSelecionado,
        bancoNome: getBancoNome(bancoSelecionado),
        agencia,
        conta,
        digito,
        tipoConta,
        titularNome,
        titularCpf,
        atualizadoEm: {} as any,
      });
      toast.success('Conta bancária salva!');
    } catch (error) {
      toast.error('Erro ao salvar conta bancária');
    } finally {
      setSalvandoBanco(false);
    }
  };

  // Salvar gateway
  const handleSalvarGateway = async (gw: 'abacatepay') => {
    if (!user) return;
    try {
      await salvarPreferenciaGateway(user.uid, gw);
      setGatewayPreferido(gw);
      toast.success('Preferência salva!');
    } catch (error) {
      toast.error('Erro ao salvar preferência');
    }
  };

  const bancosFiltrados = bancosBrasileiros.filter(banco =>
    banco.nome.toLowerCase().includes(buscaBanco.toLowerCase()) ||
    banco.codigo.includes(buscaBanco)
  );

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
        </nav>

        {/* Configurações no final */}
        <div className="border-t border-gray-100 pt-4">
          <a href="/configuracoes" className="flex items-center gap-3 px-4 py-2.5 text-gray-800 bg-gray-200 rounded-full cursor-pointer" style={{ fontFamily: "'Figtree SemiBold', sans-serif" }}>
            <GearSix size={20} weight="fill" />
            <span>Configurações</span>
          </a>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1">
        <header className="py-3 border-b border-gray-100 px-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
              Configurações
            </h2>
            <p className="text-gray-500 mt-1" style={{ fontFamily: 'var(--font-medium)' }}>
              Gerencie seu perfil e preferências
            </p>
          </div>

          <div className="flex items-center gap-4">
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
        <div className="p-6 max-w-3xl">
          {/* Seção: Perfil */}
          <div className="border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg text-gray-900 mb-6" style={{ fontFamily: 'var(--font-bold)' }}>
              Perfil
            </h3>

            <div className="flex items-center gap-6 mb-6">
              {/* Foto */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="Perfil" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFoto}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                >
                  {uploadingFoto ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera01Icon size={16} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoto}
                  className="hidden"
                />
              </div>

              {/* Info */}
              <div className="flex-1">
                <p className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-semibold)' }}>
                  {user?.displayName || "Sem nome"}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Seção: Chaves PIX */}
          <div className="border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg text-gray-900 mb-6" style={{ fontFamily: 'var(--font-bold)' }}>
              Chaves PIX
            </h3>

            {carregandoChaves ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Carregando...</p>
              </div>
            ) : (
              <>
                {/* Lista de chaves salvas */}
                {chavesSalvas.length > 0 && (
                  <div className="space-y-3 mb-6">
                    {chavesSalvas.map((chave) => {
                      const tipoInfo = tiposChavePix.find(t => t.tipo === chave.tipoChave);
                      const IconComponent = tipoInfo?.icon || Key01Icon;
                      return (
                        <div
                          key={chave.id}
                          className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <IconComponent size={20} className="text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800" style={{ fontFamily: 'var(--font-semibold)' }}>
                              {tipoInfo?.label || 'Chave PIX'}
                              {chave.principal && (
                                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Principal</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{chave.chave}</p>
                          </div>
                          <button
                            onClick={() => chave.id && handleRemoverChave(chave.id)}
                            disabled={removendoChaveId === chave.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {removendoChaveId === chave.id ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                            ) : (
                              <Delete02Icon size={18} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Adicionar nova chave */}
                <div className="border border-dashed border-gray-300 rounded-xl p-4">
                  <p className="text-sm text-gray-600 mb-3" style={{ fontFamily: 'var(--font-medium)' }}>
                    Adicionar nova chave
                  </p>
                  <div className="grid grid-cols-5 gap-2 mb-3">
                    {tiposChavePix.map((tipo) => {
                      const IconComponent = tipo.icon;
                      return (
                        <button
                          key={tipo.tipo}
                          onClick={() => {
                            setNovaChaveTipo(tipo.tipo);
                            setNovaChaveValor('');
                          }}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors cursor-pointer ${
                            novaChaveTipo === tipo.tipo
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent size={18} className={novaChaveTipo === tipo.tipo ? 'text-blue-500' : 'text-gray-400'} />
                          <span className={`text-xs ${novaChaveTipo === tipo.tipo ? 'text-blue-700' : 'text-gray-600'}`}>
                            {tipo.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={novaChaveValor}
                      onChange={(e) => setNovaChaveValor(e.target.value)}
                      placeholder={tiposChavePix.find(t => t.tipo === novaChaveTipo)?.placeholder}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      style={{ fontFamily: 'var(--font-medium)' }}
                    />
                    <button
                      onClick={handleAdicionarChave}
                      disabled={salvandoChave}
                      className="px-5 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                      style={{ fontFamily: 'var(--font-semibold)' }}
                    >
                      {salvandoChave ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        'Salvar'
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Seção: Conta Bancária */}
          <div className="border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg text-gray-900" style={{ fontFamily: 'var(--font-bold)' }}>
                Conta Bancária
              </h3>
              {contaBancaria && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckmarkCircle02Icon size={16} />
                  <span className="text-xs" style={{ fontFamily: 'var(--font-medium)' }}>Salva</span>
                </div>
              )}
            </div>

            {carregandoBanco ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Banco */}
                <div className="relative">
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
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
                        className="text-blue-500 hover:text-blue-700 cursor-pointer"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
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
                    <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                      Conta
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={conta}
                        onChange={(e) => setConta(e.target.value.replace(/\D/g, ''))}
                        placeholder="00000000"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        style={{ fontFamily: 'var(--font-medium)' }}
                      />
                      <input
                        type="text"
                        value={digito}
                        onChange={(e) => setDigito(e.target.value.replace(/\D/g, ''))}
                        placeholder="0"
                        maxLength={1}
                        className="w-14 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-center"
                        style={{ fontFamily: 'var(--font-medium)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Tipo de conta */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
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

                {/* Titular */}
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
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
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontFamily: 'var(--font-semibold)' }}>
                    CPF do titular
                  </label>
                  <input
                    type="text"
                    value={titularCpf}
                    onChange={(e) => setTitularCpf(e.target.value.replace(/\D/g, ''))}
                    placeholder="00000000000"
                    maxLength={11}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                    style={{ fontFamily: 'var(--font-medium)' }}
                  />
                </div>

                <button
                  onClick={handleSalvarBanco}
                  disabled={salvandoBanco}
                  className="w-full py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ fontFamily: 'var(--font-semibold)' }}
                >
                  {salvandoBanco ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <CheckmarkCircle02Icon size={18} />
                      Salvar conta bancária
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Seção: Gateway de Pagamento */}
          <div className="border border-gray-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg text-gray-900 mb-6" style={{ fontFamily: 'var(--font-bold)' }}>
              Gateway de Pagamento
            </h3>

            {carregandoGateway ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-500">Carregando...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-medium)' }}>
                  Processador usado para saques via PIX
                </p>
                <div
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                    gatewayPreferido === 'abacatepay'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
                    <span className="text-2xl">🥑</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-green-700" style={{ fontFamily: 'var(--font-semibold)' }}>
                      AbacatePay
                    </p>
                    <p className="text-xs text-gray-500">PIX e boleto Brasil</p>
                  </div>
                  {gatewayPreferido === 'abacatepay' ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckmarkCircle02Icon size={18} />
                      <span className="text-sm" style={{ fontFamily: 'var(--font-medium)' }}>Ativo</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSalvarGateway('abacatepay')}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer text-sm"
                      style={{ fontFamily: 'var(--font-semibold)' }}
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rodapé Premium */}
      <FooterPremium />
      <div className="h-16" />
    </div>
  );
}
