"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {
  Cancel01Icon,
  ArrowLeft01Icon,
  CreditCardIcon,
  InformationCircleIcon,
  SecurityCheckIcon,
  Clock01Icon,
  PercentCircleIcon,
  FlashIcon,
  Loading03Icon,
  BlockedIcon,
  CheckmarkCircle02Icon
} from "hugeicons-react";

interface ModalAssinaturaProps {
  aberto: boolean;
  onFechar: () => void;
}

type Etapa = 'planos' | 'checkout' | 'sucesso';

interface Plano {
  id: string;
  nome: string;
  precoMensal: number;
  precoTotal: number;
  duracao: number;
  economia?: string;
  popular?: boolean;
}

const planos: Plano[] = [
  {
    id: 'anual',
    nome: 'Anual',
    precoMensal: 7.29,
    precoTotal: 87.48,
    duracao: 12,
    economia: 'Economize 50%',
    popular: true
  },
  {
    id: 'semestral',
    nome: 'Semestral',
    precoMensal: 9.99,
    precoTotal: 59.94,
    duracao: 6,
    economia: 'Economize 30%'
  },
  {
    id: 'mensal',
    nome: 'Mensal',
    precoMensal: 14.29,
    precoTotal: 14.29,
    duracao: 1
  }
];

export default function ModalAssinatura({ aberto, onFechar }: ModalAssinaturaProps) {
  const [etapa, setEtapa] = useState<Etapa>('planos');
  const [planoSelecionado, setPlanoSelecionado] = useState<Plano>(planos[0]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  // Campos do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [validity, setValidity] = useState('');
  const [cvc, setCvc] = useState('');
  const [cep, setCep] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cpf, setCpf] = useState('');

  // Carregar Stripe
  useEffect(() => {
    loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!).then(setStripe);
  }, []);

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
  };

  const formatValidity = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + ' / ' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 8) {
      return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
    return value;
  };

  const calcularDataRenovacao = (meses: number) => {
    const data = new Date();
    data.setMonth(data.getMonth() + meses);
    return data.toLocaleDateString('pt-BR');
  };

  const validarFormulario = () => {
    const cardNumberClean = cardNumber.replace(/\s/g, '');
    const validityClean = validity.replace(/\s|\//g, '');
    const cvcClean = cvc;

    if (cardNumberClean.length < 13) {
      setErro('Número do cartão inválido');
      return false;
    }
    if (validityClean.length < 4) {
      setErro('Data de validade inválida');
      return false;
    }
    if (cvcClean.length < 3) {
      setErro('CVC inválido');
      return false;
    }
    if (!cardHolder.trim()) {
      setErro('Nome do titular é obrigatório');
      return false;
    }

    return true;
  };

  const handlePagar = async () => {
    const user = auth.currentUser;

    if (!user) {
      setErro('Você precisa estar logado para assinar');
      return;
    }

    if (!stripe) {
      setErro('Erro ao carregar sistema de pagamento');
      return;
    }

    if (!validarFormulario()) {
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      // Extrair dados do cartão
      const cardNumberClean = cardNumber.replace(/\s/g, '');
      const validityClean = validity.replace(/\s|\//g, '');
      const expMonth = parseInt(validityClean.slice(0, 2));
      const expYear = parseInt('20' + validityClean.slice(2, 4));

      // Criar PaymentMethod com Stripe.js
      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardNumberClean,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvc,
        },
        billing_details: {
          name: cardHolder,
          address: {
            postal_code: cep.replace(/\D/g, ''),
          },
        },
      } as any);

      if (stripeError) {
        setErro(stripeError.message || 'Erro ao processar cartão');
        setCarregando(false);
        return;
      }

      if (!paymentMethod) {
        setErro('Erro ao criar método de pagamento');
        setCarregando(false);
        return;
      }

      // Enviar para o backend processar
      const response = await fetch('/api/assinatura/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          usuarioId: user.uid,
          usuarioEmail: user.email,
          usuarioNome: user.displayName || cardHolder,
          planoId: planoSelecionado.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEtapa('sucesso');
      } else if (data.requires_action && data.clientSecret) {
        // 3D Secure necessário
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret);

        if (confirmError) {
          setErro(confirmError.message || 'Falha na autenticação do cartão');
        } else {
          setEtapa('sucesso');
        }
      } else {
        setErro(data.error || 'Erro ao processar pagamento');
      }
    } catch (error: any) {
      console.error('Erro:', error);
      setErro('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const fecharModal = () => {
    setEtapa('planos');
    setCardNumber('');
    setValidity('');
    setCvc('');
    setCep('');
    setCardHolder('');
    setCpf('');
    setErro(null);
    onFechar();
  };

  const handleSucessoContinuar = () => {
    fecharModal();
    window.location.reload();
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={fecharModal} />

      {/* Modal */}
      <div className="min-h-full flex items-center justify-center p-4">

        {/* Etapa: Planos */}
        {etapa === 'planos' && (
          <div className="relative bg-white rounded-2xl w-full max-w-6xl shadow-2xl animate-slideUp text-black">
            <div className="p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div />
                <button
                  onClick={fecharModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Cancel01Icon size={24} className="text-gray-600" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-12">
                {/* Lado esquerdo - Planos */}
                <div>
                  {/* Logo */}
                  <div className="mb-6">
                    <div className="inline-block relative">
                      <span
                        className="bg-black text-white px-4 py-1.5 text-lg transform -skew-x-3 inline-block font-black"
                      >
                        Questiongo
                      </span>
                      <div className="absolute -right-2 -top-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                        +
                      </div>
                    </div>
                  </div>

                  <h2 className="text-3xl text-gray-900 mb-2 font-black">
                    Escolha seu plano
                  </h2>
                  <p className="text-gray-500 mb-6 text-sm">
                    <span className="text-gray-900 font-semibold">Cancele a qualquer momento.</span> Você receberá um e-mail 7 dias antes da renovação.
                  </p>

                  {/* Lista de Planos */}
                  <div className="space-y-3 mb-6">
                    {planos.map((plano) => (
                      <div
                        key={plano.id}
                        onClick={() => setPlanoSelecionado(plano)}
                        className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                          planoSelecionado.id === plano.id
                            ? 'bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0_0_#1a1a1a] -translate-x-0.5 -translate-y-0.5 z-10'
                            : 'bg-gray-50 border-2 border-[#e5e5e5] hover:border-[#1a1a1a] hover:shadow-[4px_4px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5'
                        }`}
                      >
                        {plano.popular && (
                          <span className="absolute -top-2 left-4 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                            Mais popular
                          </span>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              planoSelecionado.id === plano.id
                                ? 'border-[#1a1a1a] bg-[#1a1a1a]'
                                : 'border-gray-300'
                            }`}>
                              {planoSelecionado.id === plano.id && (
                                <div className="w-2 h-2 bg-white rounded-full" />
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-gray-900">{plano.nome}</p>
                              {plano.economia && (
                                <p className="text-xs text-green-600 font-medium">{plano.economia}</p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-black text-gray-900">
                              R${plano.precoMensal.toFixed(2).replace('.', ',')}
                              <span className="text-sm font-normal text-gray-500">/mês</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              Total: R${plano.precoTotal.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setEtapa('checkout')}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors"
                  >
                    CONTINUAR
                  </button>
                </div>

                {/* Lado direito - Benefícios */}
                <div className="md:pl-8 md:border-l border-gray-100">
                  <h3 className="text-2xl text-gray-900 mb-8 leading-tight font-black">
                    Turbine seus ganhos com recursos premium!
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-xl shadow-[3px_3px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a1a1a] transition-all">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
                        <Clock01Icon size={20} className="text-white" />
                      </div>
                      <p className="text-gray-900 font-bold text-sm">30 min de vantagem</p>
                      <p className="text-gray-500 text-xs mt-1">Receba perguntas antes</p>
                    </div>

                    <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-xl shadow-[3px_3px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a1a1a] transition-all">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                        <PercentCircleIcon size={20} className="text-white" />
                      </div>
                      <p className="text-gray-900 font-bold text-sm">Taxa de apenas 5%</p>
                      <p className="text-gray-500 text-xs mt-1">Em vez de 15%</p>
                    </div>

                    <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-xl shadow-[3px_3px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a1a1a] transition-all">
                      <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mb-3">
                        <FlashIcon size={20} className="text-white" />
                      </div>
                      <p className="text-gray-900 font-bold text-sm">Saques instantâneos</p>
                      <p className="text-gray-500 text-xs mt-1">Receba na hora</p>
                    </div>

                    <div className="p-4 bg-white border-2 border-[#1a1a1a] rounded-xl shadow-[3px_3px_0_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#1a1a1a] transition-all">
                      <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mb-3">
                        <BlockedIcon size={20} className="text-white" />
                      </div>
                      <p className="text-gray-900 font-bold text-sm">Sem anúncios</p>
                      <p className="text-gray-500 text-xs mt-1">Experiência limpa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Etapa: Checkout */}
        {etapa === 'checkout' && (
          <div className="relative bg-white rounded-2xl w-full max-w-7xl shadow-2xl animate-slideUp text-black">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Lado esquerdo - Formulário */}
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                  <button
                    onClick={() => setEtapa('planos')}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft01Icon size={24} className="text-gray-600" />
                  </button>
                  <button
                    onClick={fecharModal}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors md:hidden"
                  >
                    <Cancel01Icon size={24} className="text-gray-600" />
                  </button>
                </div>

                <h1 className="text-3xl mb-10 font-black">
                  Complete a sua compra
                </h1>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">Insira as informações do seu cartão</h2>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-700 font-bold text-xs bg-gray-100 px-2 py-1 rounded">VISA</span>
                        <div className="flex bg-gray-100 px-2 py-1 rounded">
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                          <div className="w-3 h-3 bg-yellow-500 rounded-full -ml-1" />
                        </div>
                        <span className="text-orange-500 font-bold text-xs bg-gray-100 px-2 py-1 rounded">ELO</span>
                        <span className="text-gray-400 text-xs">+ mais</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Número do cartão */}
                      <div>
                        <label className="block text-sm font-bold mb-2">Número do cartão</label>
                        <div className="relative">
                          <CreditCardIcon size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="1234 1234 1234 1234"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(formatCardNumber(e.target.value.slice(0, 19)))}
                            className="w-full pl-12 pr-12 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                          <SecurityCheckIcon size={18} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300" />
                        </div>
                      </div>

                      {/* Validade, CVC, CEP */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-bold mb-2">Validade</label>
                          <input
                            type="text"
                            placeholder="MM / AA"
                            value={validity}
                            onChange={(e) => setValidity(formatValidity(e.target.value.slice(0, 7)))}
                            className="w-full px-5 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                            CVC <InformationCircleIcon size={14} className="text-gray-400" />
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            value={cvc}
                            onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            className="w-full px-5 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                            CEP <InformationCircleIcon size={14} className="text-gray-400" />
                          </label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            value={cep}
                            onChange={(e) => setCep(formatCEP(e.target.value.slice(0, 9)))}
                            className="w-full px-5 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      {/* Titular */}
                      <div>
                        <label className="block text-sm font-bold mb-2">Titular do cartão</label>
                        <input
                          type="text"
                          placeholder="ex.: Carlos M Silva"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full px-5 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* CPF */}
                      <div>
                        <label className="block text-sm font-bold mb-2 flex items-center gap-1">
                          CPF do titular <InformationCircleIcon size={14} className="text-gray-400" />
                        </label>
                        <input
                          type="text"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(formatCPF(e.target.value.slice(0, 14)))}
                          className="w-full px-5 py-3 bg-gray-100 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Erro */}
                  {erro && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm">
                      {erro}
                    </div>
                  )}

                  <button
                    onClick={handlePagar}
                    disabled={carregando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {carregando ? (
                      <>
                        <Loading03Icon size={22} className="animate-spin" />
                        PROCESSANDO...
                      </>
                    ) : (
                      'PAGAR COM CARTÃO'
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <SecurityCheckIcon size={18} className="text-gray-500" />
                    <span className="font-semibold">PAGAMENTO SEGURO</span>
                    <span className="text-gray-400">Criptografia 256-bit SSL</span>
                  </div>
                </div>
              </div>

              {/* Lado direito - Resumo */}
              <div className="bg-gray-50 p-8 md:p-12 relative">
                <button
                  onClick={fecharModal}
                  className="absolute top-8 right-8 p-2 hover:bg-gray-200 rounded-full transition-colors hidden md:block"
                >
                  <Cancel01Icon size={24} className="text-gray-600" />
                </button>

                <h2 className="text-2xl mb-8 font-black">
                  Resumo do pagamento
                </h2>

                <div className="space-y-6">
                  {/* Plano selecionado */}
                  <div className="flex items-start gap-3">
                    <div className="bg-black text-white px-3 py-1 text-xs font-bold rounded">
                      Q+
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Plano {planoSelecionado.nome} Premium</h3>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Duração da assinatura</span>
                      <span className="font-bold">{planoSelecionado.duracao} {planoSelecionado.duracao === 1 ? 'mês' : 'meses'}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-semibold">Renovação automática em</span>
                      <div className="text-right">
                        <div className="font-bold">{calcularDataRenovacao(planoSelecionado.duracao)}</div>
                        <div className="text-gray-500 text-xs">depois a cada {planoSelecionado.duracao} {planoSelecionado.duracao === 1 ? 'mês' : 'meses'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="border-t pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xl font-bold">Pago agora</div>
                      <div className="text-right">
                        {planoSelecionado.economia && (
                          <div className="text-gray-400 line-through text-lg">
                            R${(planoSelecionado.precoTotal * 2).toFixed(2).replace('.', ',')}
                          </div>
                        )}
                        <div className="text-3xl font-bold text-blue-600">
                          R${planoSelecionado.precoTotal.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    </div>
                    {planoSelecionado.economia && (
                      <div className="text-right text-green-600 font-bold text-sm">
                        {planoSelecionado.economia}
                      </div>
                    )}
                  </div>

                  {/* Política de cancelamento */}
                  <div className="border-t pt-6">
                    <h3 className="font-bold mb-3">Política de cancelamento</h3>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Cancele a qualquer momento.</span> Você receberá um e-mail{' '}
                      <span className="font-semibold">7 dias antes</span> da renovação da assinatura.
                    </p>
                  </div>

                  {/* Termos */}
                  <div className="border-t pt-6">
                    <h3 className="font-bold mb-3">Informações de faturamento</h3>
                    <p className="text-sm text-gray-600">
                      Ao clicar em "PAGAR COM CARTÃO" você confirma ter lido e concordado com nossos{' '}
                      <a href="#" className="text-blue-600 font-semibold">Termos de uso</a> e{' '}
                      <a href="#" className="text-blue-600 font-semibold">Política de privacidade</a>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Etapa: Sucesso */}
        {etapa === 'sucesso' && (
          <div className="bg-white rounded-2xl w-full max-w-lg p-8 shadow-2xl animate-slideUp text-center text-black">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckmarkCircle02Icon size={40} className="text-green-600" />
            </div>

            <h1 className="text-2xl text-gray-900 mb-3 font-black">
              Pagamento confirmado!
            </h1>

            <p className="text-gray-600 mb-6">
              Bem-vindo ao Questiongo Premium! Seu plano {planoSelecionado.nome} já está ativo.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-500 text-sm">Plano</span>
                <span className="font-semibold">{planoSelecionado.nome} Premium</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Valor pago</span>
                <span className="font-semibold">R${planoSelecionado.precoTotal.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>

            <button
              onClick={handleSucessoContinuar}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              CONTINUAR
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
