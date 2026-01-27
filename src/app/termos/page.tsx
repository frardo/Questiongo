"use client";

import Link from "next/link";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-[#f9f9f9]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FF4F00] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-bold text-[#1a1a1a] text-lg">QuestionGo</span>
          </Link>
          <Link
            href="/"
            className="text-[#FF4F00] hover:text-[#e54600] font-medium text-sm flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-2">Termos de Uso</h1>
        <p className="text-[#666] mb-8">Última atualização: Janeiro de 2026</p>

        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm space-y-8">
          {/* 1. Definições */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">1. Definições</h2>
            <ul className="space-y-2 text-[#444] leading-relaxed">
              <li><strong>QuestionGo:</strong> Plataforma digital de perguntas e respostas monetizadas, operada pela QuestionGo Ltda.</li>
              <li><strong>Usuário:</strong> Qualquer pessoa física que acesse ou utilize a plataforma, seja para fazer perguntas ou responder.</li>
              <li><strong>Perguntador:</strong> Usuário que formula e publica perguntas na plataforma, definindo um valor de recompensa.</li>
              <li><strong>Respondedor:</strong> Usuário que fornece respostas às perguntas publicadas na plataforma.</li>
              <li><strong>Recompensa:</strong> Valor monetário definido pelo Perguntador para remunerar a melhor resposta.</li>
            </ul>
          </section>

          {/* 2. Descrição do Serviço */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">2. Descrição do Serviço</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              O QuestionGo é uma plataforma que conecta pessoas que têm dúvidas com especialistas dispostos a respondê-las mediante recompensa financeira. O serviço funciona da seguinte forma:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[#444] leading-relaxed">
              <li>O Perguntador cria uma pergunta e define um valor de recompensa.</li>
              <li>A pergunta fica disponível no mercado para que Respondedores possam visualizá-la.</li>
              <li>Respondedores interessados enviam suas respostas.</li>
              <li>O Perguntador escolhe a melhor resposta e libera a recompensa.</li>
              <li>O Respondedor recebe o valor, descontada a taxa da plataforma.</li>
            </ol>
          </section>

          {/* 3. Cadastro e Responsabilidades */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">3. Cadastro e Responsabilidades</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Para utilizar o QuestionGo, o usuário deve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Ter no mínimo 18 anos de idade ou consentimento dos pais/responsáveis.</li>
              <li>Fornecer informações verdadeiras e atualizadas durante o cadastro.</li>
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Ser responsável por todas as atividades realizadas em sua conta.</li>
              <li>Notificar imediatamente o QuestionGo sobre qualquer uso não autorizado.</li>
            </ul>
          </section>

          {/* 4. Pagamentos e Comissões */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">4. Pagamentos e Comissões</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              O modelo financeiro do QuestionGo funciona da seguinte forma:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>O Perguntador paga o valor da recompensa ao criar a pergunta.</li>
              <li>O QuestionGo retém <strong>15% (quinze por cento)</strong> do valor como taxa de serviço.</li>
              <li>O Respondedor recebe <strong>85% (oitenta e cinco por cento)</strong> do valor da recompensa.</li>
              <li>Os pagamentos são processados por parceiros de pagamento (Stripe, AbacatePay).</li>
              <li>Saques podem estar sujeitos a valores mínimos e prazos de processamento.</li>
              <li>Em caso de reembolso, aplicam-se as políticas específicas de cada situação.</li>
            </ul>
          </section>

          {/* 5. Propriedade Intelectual */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">5. Propriedade Intelectual</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Sobre os direitos de propriedade intelectual:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>O conteúdo das perguntas pertence ao Perguntador que as criou.</li>
              <li>O conteúdo das respostas pertence ao Respondedor que as elaborou.</li>
              <li>Ao publicar conteúdo, o usuário concede ao QuestionGo licença para exibir, armazenar e distribuir o conteúdo na plataforma.</li>
              <li>A marca, logo e elementos visuais do QuestionGo são propriedade exclusiva da QuestionGo Ltda.</li>
              <li>É proibida a reprodução não autorizada de qualquer conteúdo da plataforma.</li>
            </ul>
          </section>

          {/* 6. Proibições */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">6. Condutas Proibidas</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              É expressamente proibido no QuestionGo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Publicar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros.</li>
              <li>Usar a plataforma para spam, phishing ou qualquer atividade fraudulenta.</li>
              <li>Criar múltiplas contas para manipular o sistema.</li>
              <li>Compartilhar credenciais de acesso com terceiros.</li>
              <li>Tentar burlar os sistemas de pagamento da plataforma.</li>
              <li>Coletar dados de outros usuários sem autorização.</li>
              <li>Usar bots ou sistemas automatizados sem autorização prévia.</li>
              <li>Publicar perguntas ou respostas com conteúdo gerado por IA sem a devida identificação.</li>
            </ul>
          </section>

          {/* 7. Limitação de Responsabilidade */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">7. Limitação de Responsabilidade</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              O QuestionGo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Não garante a precisão, qualidade ou veracidade das respostas fornecidas pelos Respondedores.</li>
              <li>Não se responsabiliza por decisões tomadas com base nas respostas da plataforma.</li>
              <li>Não é responsável por disputas entre Perguntadores e Respondedores.</li>
              <li>Não garante disponibilidade ininterrupta do serviço.</li>
              <li>Reserva-se o direito de suspender contas que violem estes termos.</li>
            </ul>
          </section>

          {/* 8. Rescisão */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">8. Rescisão</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              A relação entre o usuário e o QuestionGo pode ser encerrada:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Por solicitação do usuário a qualquer momento.</li>
              <li>Por iniciativa do QuestionGo em caso de violação destes Termos.</li>
              <li>Por inatividade prolongada da conta.</li>
              <li>Em caso de encerramento das operações da plataforma.</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-4">
              Em caso de rescisão, o usuário terá direito a sacar eventuais saldos disponíveis, respeitando os prazos e condições vigentes.
            </p>
          </section>

          {/* 9. Alterações nos Termos */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">9. Alterações nos Termos</h2>
            <p className="text-[#444] leading-relaxed">
              O QuestionGo reserva-se o direito de modificar estes Termos de Uso a qualquer momento. Alterações significativas serão comunicadas aos usuários por e-mail ou notificação na plataforma. O uso continuado do serviço após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          {/* 10. Foro */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">10. Legislação Aplicável e Foro</h2>
            <p className="text-[#444] leading-relaxed">
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias decorrentes deste instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          {/* Contato */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">Contato</h2>
            <p className="text-[#444] leading-relaxed">
              Em caso de dúvidas sobre estes Termos de Uso, entre em contato:
            </p>
            <p className="text-[#444] leading-relaxed mt-2">
              <strong>QuestionGo Ltda</strong><br />
              E-mail: <a href="mailto:contato@questiongo.com" className="text-[#FF4F00] hover:underline">contato@questiongo.com</a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-[#666] text-sm">
          <p>© 2026 QuestionGo. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
