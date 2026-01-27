// AbacatePay API Integration
// Documentação: https://docs.abacatepay.com/pages/introduction

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

interface AbacatePayCustomer {
  id?: string;
  name: string;
  email: string;
  cellphone?: string;
  taxId?: string; // CPF
}

interface AbacatePayBilling {
  id: string;
  url: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  devMode: boolean;
  methods: string[];
  products: Array<{
    externalId: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
  }>;
  customer?: AbacatePayCustomer;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface AbacatePayPixQrCode {
  id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED';
  brCode: string; // Código copia e cola
  brCodeBase64: string; // QR Code em base64
  expiresAt: string;
  createdAt: string;
}

interface AbacatePayResponse<T> {
  data: T;
  error: {
    message: string;
    code: string;
  } | null;
}

// Função helper para fazer requisições à API
async function abacatePayRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>
): Promise<AbacatePayResponse<T>> {
  const apiKey = process.env.ABACATEPAY_API_KEY;

  if (!apiKey) {
    throw new Error('ABACATEPAY_API_KEY não configurada');
  }

  const response = await fetch(`${ABACATEPAY_API_URL}${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  return data as AbacatePayResponse<T>;
}

// Criar cliente na AbacatePay
export async function criarCliente(cliente: {
  name: string;
  email: string;
  cellphone?: string;
  taxId?: string;
}): Promise<AbacatePayCustomer> {
  const response = await abacatePayRequest<AbacatePayCustomer>('/customer/create', 'POST', cliente);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Listar clientes
export async function listarClientes(): Promise<AbacatePayCustomer[]> {
  const response = await abacatePayRequest<AbacatePayCustomer[]>('/customer/list', 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Criar cobrança (billing) com link de pagamento
export async function criarCobranca(dados: {
  frequency: 'ONE_TIME';
  methods: ('PIX' | 'CREDIT_CARD' | 'BOLETO')[];
  products: Array<{
    externalId: string;
    name: string;
    description?: string;
    quantity: number;
    price: number; // Em centavos
  }>;
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  metadata?: Record<string, string>;
}): Promise<AbacatePayBilling> {
  const response = await abacatePayRequest<AbacatePayBilling>('/billing/create', 'POST', dados);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Listar cobranças
export async function listarCobrancas(): Promise<AbacatePayBilling[]> {
  const response = await abacatePayRequest<AbacatePayBilling[]>('/billing/list', 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Criar QR Code PIX diretamente
export async function criarPixQrCode(dados: {
  amount: number; // Em centavos
  expiresIn?: number; // Segundos até expirar (default: 3600)
  description?: string;
  customer?: {
    name: string;
    email: string;
    cellphone?: string;
    taxId?: string;
  };
  metadata?: Record<string, string>;
}): Promise<AbacatePayPixQrCode> {
  const response = await abacatePayRequest<AbacatePayPixQrCode>('/pixQrCode/create', 'POST', dados);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Verificar status do PIX QR Code
export async function verificarPixStatus(pixId: string): Promise<AbacatePayPixQrCode> {
  const response = await abacatePayRequest<AbacatePayPixQrCode>(`/pixQrCode/check?id=${pixId}`, 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Validar webhook da AbacatePay
export function validarWebhook(webhookSecret: string, secretRecebido: string): boolean {
  return webhookSecret === secretRecebido;
}

// Tipos para webhook
export interface AbacatePayWebhookEvent {
  event: 'billing.paid' | 'billing.expired' | 'pix.paid' | 'pix.expired' | 'withdraw.paid';
  data: {
    id: string;
    amount: number;
    status: string;
    metadata?: Record<string, string>;
  };
}

// ==================== SAQUES / WITHDRAWALS ====================

// Tipos de Saque
export interface AbacatePayWithdrawal {
  id: string;
  amount: number; // Em centavos
  pixKey: string;
  notes?: string;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED';
  createdAt: string;
  paidAt?: string;
}

// Criar saque (transferir para chave PIX)
export async function criarSaque(dados: {
  amount: number; // Em centavos
  pixKey: string;
  notes?: string;
}): Promise<AbacatePayWithdrawal> {
  const response = await abacatePayRequest<AbacatePayWithdrawal>('/withdraw/create', 'POST', dados);

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Buscar saque por ID
export async function buscarSaque(withdrawId: string): Promise<AbacatePayWithdrawal> {
  const response = await abacatePayRequest<AbacatePayWithdrawal>(`/withdraw/get?id=${withdrawId}`, 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Listar saques
export async function listarSaques(): Promise<AbacatePayWithdrawal[]> {
  const response = await abacatePayRequest<AbacatePayWithdrawal[]>('/withdraw/list', 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

// Buscar saldo da conta AbacatePay
export async function buscarSaldoAbacatePay(): Promise<{
  balance: number; // Em centavos
  pendingBalance: number;
}> {
  const response = await abacatePayRequest<{ balance: number; pendingBalance: number }>('/store/get', 'GET');

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}
