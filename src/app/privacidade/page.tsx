"use client";

import Link from "next/link";

export default function PoliticaDePrivacidade() {
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
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-2">Política de Privacidade</h1>
        <p className="text-[#666] mb-8">Última atualização: Janeiro de 2026</p>

        <div className="bg-white rounded-2xl p-6 md:p-10 shadow-sm space-y-8">
          {/* Introdução */}
          <section>
            <p className="text-[#444] leading-relaxed">
              A QuestionGo Ltda (&quot;QuestionGo&quot;, &quot;nós&quot;, &quot;nosso&quot;) está comprometida em proteger a privacidade dos nossos usuários. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma.
            </p>
          </section>

          {/* 1. Dados Coletados */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">1. Dados Coletados</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Coletamos os seguintes tipos de informações:
            </p>

            <h3 className="font-semibold text-[#1a1a1a] mb-2">1.1 Dados fornecidos pelo usuário:</h3>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed mb-4">
              <li>Nome completo</li>
              <li>Endereço de e-mail</li>
              <li>Foto de perfil (quando fornecida via Google ou Apple)</li>
              <li>Informações de pagamento (processadas por terceiros)</li>
              <li>Conteúdo de perguntas e respostas publicadas</li>
            </ul>

            <h3 className="font-semibold text-[#1a1a1a] mb-2">1.2 Dados coletados automaticamente:</h3>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Endereço IP</li>
              <li>Tipo de navegador e dispositivo</li>
              <li>Páginas visitadas e tempo de permanência</li>
              <li>Data e hora de acesso</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          {/* 2. Uso dos Dados */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">2. Uso dos Dados</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Utilizamos suas informações para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Criar e gerenciar sua conta na plataforma</li>
              <li>Processar pagamentos e transferências</li>
              <li>Permitir a publicação de perguntas e respostas</li>
              <li>Enviar notificações sobre atividades da sua conta</li>
              <li>Fornecer suporte ao cliente</li>
              <li>Melhorar nossos serviços e experiência do usuário</li>
              <li>Prevenir fraudes e atividades ilegais</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          {/* 3. Compartilhamento de Dados */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">3. Compartilhamento de Dados</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Podemos compartilhar suas informações com:
            </p>

            <h3 className="font-semibold text-[#1a1a1a] mb-2">3.1 Parceiros de serviço:</h3>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed mb-4">
              <li><strong>Firebase (Google):</strong> Autenticação e banco de dados</li>
              <li><strong>Stripe:</strong> Processamento de pagamentos</li>
              <li><strong>AbacatePay:</strong> Processamento de pagamentos via PIX</li>
              <li><strong>Cloudinary:</strong> Armazenamento de imagens e arquivos</li>
            </ul>

            <h3 className="font-semibold text-[#1a1a1a] mb-2">3.2 Outros casos:</h3>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para proteger nossos direitos e segurança</li>
              <li>Em caso de fusão, aquisição ou venda de ativos (com notificação prévia)</li>
            </ul>

            <p className="text-[#444] leading-relaxed mt-4">
              <strong>Importante:</strong> Nunca vendemos suas informações pessoais a terceiros para fins de marketing.
            </p>
          </section>

          {/* 4. Segurança */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">4. Segurança dos Dados</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Implementamos medidas de segurança para proteger suas informações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
              <li>Autenticação segura via Google e Apple</li>
              <li>Acesso restrito aos dados por funcionários autorizados</li>
              <li>Monitoramento contínuo de atividades suspeitas</li>
              <li>Backups regulares e redundância de dados</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-4">
              Embora nos esforcemos para proteger suas informações, nenhum método de transmissão pela Internet é 100% seguro. Não podemos garantir segurança absoluta.
            </p>
          </section>

          {/* 5. Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">5. Cookies e Tecnologias Similares</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              Utilizamos cookies para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li><strong>Cookies essenciais:</strong> Necessários para o funcionamento da plataforma (autenticação, sessão)</li>
              <li><strong>Cookies de desempenho:</strong> Análise de uso para melhorar nossos serviços</li>
              <li><strong>Cookies de funcionalidade:</strong> Lembrar suas preferências</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-4">
              Você pode gerenciar suas preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          {/* 6. Direitos do Usuário (LGPD) */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">6. Seus Direitos (LGPD)</h2>
            <p className="text-[#444] leading-relaxed mb-4">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed">
              <li><strong>Acesso:</strong> Solicitar cópia dos dados que temos sobre você</li>
              <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Anonimização ou eliminação:</strong> Solicitar a anonimização ou exclusão de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> Solicitar a transferência dos seus dados para outro fornecedor</li>
              <li><strong>Informação:</strong> Saber com quem compartilhamos seus dados</li>
              <li><strong>Revogação:</strong> Revogar o consentimento a qualquer momento</li>
              <li><strong>Oposição:</strong> Opor-se ao tratamento realizado sem seu consentimento</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato através do e-mail <a href="mailto:contato@questiongo.com" className="text-[#FF4F00] hover:underline">contato@questiongo.com</a>.
            </p>
          </section>

          {/* 7. Retenção de Dados */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">7. Retenção de Dados</h2>
            <p className="text-[#444] leading-relaxed">
              Mantemos seus dados pessoais pelo tempo necessário para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-[#444] leading-relaxed mt-4">
              <li>Fornecer nossos serviços enquanto sua conta estiver ativa</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Resolver disputas e fazer cumprir nossos acordos</li>
            </ul>
            <p className="text-[#444] leading-relaxed mt-4">
              Após o encerramento da conta, seus dados serão retidos por um período de até 5 anos para fins legais, após o qual serão excluídos ou anonimizados.
            </p>
          </section>

          {/* 8. Menores de Idade */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">8. Menores de Idade</h2>
            <p className="text-[#444] leading-relaxed">
              O QuestionGo não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores. Se você é pai ou responsável e acredita que seu filho nos forneceu informações pessoais, entre em contato para que possamos excluí-las.
            </p>
          </section>

          {/* 9. Alterações na Política */}
          <section>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">9. Alterações nesta Política</h2>
            <p className="text-[#444] leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Alterações significativas serão comunicadas por e-mail ou através de aviso em destaque na plataforma. Recomendamos revisar esta página regularmente para se manter informado sobre nossas práticas de privacidade.
            </p>
          </section>

          {/* 10. Contato DPO */}
          <section className="border-t border-gray-200 pt-8">
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-4">10. Contato do Encarregado (DPO)</h2>
            <p className="text-[#444] leading-relaxed">
              Para questões relacionadas à proteção de dados ou para exercer seus direitos, entre em contato com nosso Encarregado de Proteção de Dados:
            </p>
            <p className="text-[#444] leading-relaxed mt-4">
              <strong>QuestionGo Ltda</strong><br />
              Encarregado de Proteção de Dados<br />
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
