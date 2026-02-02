import { z } from 'zod';

/**
 * Schema de validação para criação de pagamento
 */
export const criarPagamentoSchema = z.object({
  perguntaId: z.string().min(1, 'ID da pergunta é obrigatório'),
  respostaId: z.string().min(1, 'ID da resposta é obrigatório'),
  valor: z.number().positive('Valor deve ser positivo').max(10000, 'Valor máximo é R$ 10.000'),
  usuarioNome: z.string().optional(),
  usuarioEmail: z.string().email().optional().or(z.literal('')),
  respondedorId: z.string().optional(),
  metodoPagamento: z.enum(['pix', 'cartao']).default('pix'),
});

/**
 * Schema de validação para verificação de pagamento
 */
export const verificarPagamentoSchema = z.object({
  perguntaId: z.string().min(1, 'ID da pergunta é obrigatório'),
  respostaId: z.string().min(1, 'ID da resposta é obrigatório'),
  billingId: z.string().optional(),
});

/**
 * Schema de validação para saque
 */
export const saqueSchema = z.object({
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  valor: z.number().min(10, 'Valor mínimo para saque é R$ 10,00').max(50000, 'Valor máximo é R$ 50.000'),
  chavePix: z.string().min(1, 'Chave PIX é obrigatória'),
  tipoChave: z.enum(['cpf', 'cnpj', 'email', 'telefone', 'aleatoria']).optional(),
  descricao: z.string().max(200).optional(),
  gateway: z.enum(['abacatepay']).default('abacatepay'),
});

/**
 * Schema de validação para checkout de assinatura
 */
export const checkoutAssinaturaSchema = z.object({
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  usuarioEmail: z.string().email('Email inválido'),
  usuarioNome: z.string().optional(),
  planoId: z.enum(['mensal', 'semestral', 'anual']).default('anual'),
});

/**
 * Schema de validação para pagamento Stripe
 */
export const pagamentoStripeSchema = z.object({
  perguntaId: z.string().min(1, 'ID da pergunta é obrigatório'),
  respostaId: z.string().min(1, 'ID da resposta é obrigatório'),
  valor: z.number().positive('Valor deve ser positivo'),
  usuarioNome: z.string().optional(),
  usuarioEmail: z.string().email().optional().or(z.literal('')),
  respondedorId: z.string().min(1, 'ID do respondedor é obrigatório'),
});

/**
 * Schema de validação para processamento de pagamento de assinatura
 */
export const processPaymentSchema = z.object({
  paymentMethodId: z.string().min(1, 'ID do método de pagamento é obrigatório'),
  usuarioId: z.string().min(1, 'ID do usuário é obrigatório'),
  usuarioEmail: z.string().email('Email inválido'),
  usuarioNome: z.string().optional(),
  planoId: z.enum(['mensal', 'semestral', 'anual']).default('anual'),
});

/**
 * Helper para validar e retornar erro formatado
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: firstError?.message || 'Dados inválidos',
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
