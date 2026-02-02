import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY não configurada');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Email para o respondedor quando pagamento é recebido
export async function enviarEmailPagamentoRecebido(
  emailDestinatario: string,
  nomeDestinatario: string,
  valorRecebido: number,
  perguntaTexto: string  // Só a pergunta, NUNCA a resposta
) {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: 'Questiongo <onboarding@resend.dev>', // Usar domínio verificado em produção
      to: emailDestinatario,
      subject: `Parabéns! Você recebeu R$ ${valorRecebido.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .valor { font-size: 36px; font-weight: bold; color: #10b981; text-align: center; margin: 20px 0; }
            .pergunta { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0; }
            .pergunta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pagamento Recebido!</h1>
            </div>
            <div class="content">
              <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
              <p>Sua resposta foi aceita e você recebeu:</p>

              <div class="valor">R$ ${valorRecebido.toFixed(2)}</div>

              <div class="pergunta">
                <div class="pergunta-label">Pergunta respondida:</div>
                <p>"${perguntaTexto.length > 150 ? perguntaTexto.substring(0, 150) + '...' : perguntaTexto}"</p>
              </div>

              <p>O valor já está disponível na sua carteira.</p>

              <p style="text-align: center; margin-top: 30px;">
                <a href="https://questiongo.com/carteira" class="btn">Ver Minha Carteira</a>
              </p>
            </div>
            <div class="footer">
              <p>Este email foi enviado automaticamente pela Questiongo.</p>
              <p>Se você não reconhece esta transação, entre em contato conosco.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

// Email para quem fez a pergunta confirmando o pagamento
export async function enviarEmailPagamentoConfirmado(
  emailDestinatario: string,
  nomeDestinatario: string,
  valorPago: number,
  perguntaTexto: string
) {
  try {
    const { data, error } = await getResendClient().emails.send({
      from: 'Questiongo <onboarding@resend.dev>',
      to: emailDestinatario,
      subject: `Pagamento confirmado - R$ ${valorPago.toFixed(2)}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .check { font-size: 48px; text-align: center; }
            .pergunta { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
            .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 25px; text-decoration: none; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Pagamento Confirmado!</h1>
            </div>
            <div class="content">
              <div class="check">✅</div>
              <p>Olá, <strong>${nomeDestinatario}</strong>!</p>
              <p>Seu pagamento de <strong>R$ ${valorPago.toFixed(2)}</strong> foi confirmado com sucesso.</p>

              <div class="pergunta">
                <p>"${perguntaTexto.length > 150 ? perguntaTexto.substring(0, 150) + '...' : perguntaTexto}"</p>
              </div>

              <p>A resposta completa já está liberada para visualização.</p>

              <p style="text-align: center; margin-top: 30px;">
                <a href="https://questiongo.com/minhas-perguntas" class="btn">Ver Minhas Perguntas</a>
              </p>
            </div>
            <div class="footer">
              <p>Obrigado por usar a Questiongo!</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}
