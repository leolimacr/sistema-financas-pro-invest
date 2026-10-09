import React from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';

export const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-surface-primary dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Helmet>
          <title>Política de Privacidade - Finanças Pro Invest</title>
          <meta name="description" content="Política de privacidade do aplicativo Finanças Pro Invest." />
        </Helmet>

        {/* Botão Voltar */}
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Voltar ao site
        </button>

        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Política de Privacidade</h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-8">Última atualização: 17 de fevereiro de 2026</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
        <h2>1. Quem é o controlador dos seus dados?</h2>
        <p>
          O Finanças Pro Invest, doravante denominado "Plataforma", é o controlador responsável pelo tratamento dos dados pessoais dos Usuários, nos termos da Lei Geral de Proteção de Dados (LGPD – Lei 13.709/2018). Qualquer comunicação relacionada a dados pessoais deve ser dirigida ao e-mail: <strong>contato@financasproinvest.com.br</strong>.
        </p>

        <h2>2. Quais dados coletamos?</h2>
        <p>Podemos coletar os seguintes dados pessoais:</p>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, data de nascimento (opcional), foto de perfil (opcional).</li>
          <li><strong>Transações financeiras:</strong> valores, categorias, descrições de receitas e despesas inseridas pelo Usuário.</li>
          <li><strong>Uso da Plataforma:</strong> logs de acesso, interações com a IA Nexus, funcionalidades utilizadas.</li>
          <li><strong>Dados de pagamento:</strong> processados de forma segura pelo Google Play ou Stripe. Não armazenamos números de cartão ou dados bancários.</li>
          <li><strong>Cookies e tecnologias similares:</strong> para autenticação, segurança e melhorias na experiência.</li>
        </ul>

        <h2>3. Como coletamos?</h2>
        <p>Os dados são fornecidos diretamente pelo Usuário (cadastro, lançamentos) ou coletados automaticamente durante a navegação (cookies, logs).</p>

        <h2>4. Para quais finalidades usamos seus dados?</h2>
        <ul>
          <li>Fornecer e personalizar os serviços da Plataforma.</li>
          <li>Processar assinaturas e pagamentos.</li>
          <li>Permitir o funcionamento da IA Nexus com base nos dados do Usuário.</li>
          <li>Melhorar a experiência, realizar análises estatísticas e de segurança.</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>

        <h2>5. Qual a base legal para o tratamento?</h2>
        <p>Utilizamos as seguintes bases legais, conforme a LGPD:</p>
        <ul>
          <li><strong>Execução de contrato:</strong> para prestar os serviços contratados (ex.: acesso ao plano premium).</li>
          <li><strong>Consentimento:</strong> para comunicações de marketing e para o uso de cookies não essenciais.</li>
          <li><strong>Obrigação legal ou regulatória:</strong> para cumprir exigências do Fisco ou do Código de Defesa do Consumidor.</li>
          <li><strong>Legítimo interesse:</strong> para melhoria contínua da Plataforma e segurança.</li>
        </ul>

        <h2>6. Compartilhamento com terceiros</h2>
        <p>Compartilhamos dados apenas quando necessário para a operação da Plataforma, sempre como operadores ou em conformidade com a LGPD:</p>
        <ul>
          <li><strong>Google (Firebase, Google Analytics):</strong> para autenticação, armazenamento, notificações e análises de uso.</li>
          <li><strong>Google Play Billing / Stripe:</strong> para processamento de pagamentos.</li>
          <li><strong>Fornecedores de IA (Gemini, OpenRouter, Mistral):</strong> para gerar respostas da IA Nexus. Esses fornecedores atuam como operadores, processando exclusivamente as informações necessárias para a funcionalidade, sob nossas instruções e com medidas de segurança compatíveis com a LGPD.</li>
          <li><strong>Autoridades judiciais ou administrativas:</strong> mediante ordem judicial ou requisição legal.</li>
        </ul>
        <p>Não vendemos dados pessoais a terceiros.</p>

        <h2>7. Cookies e tecnologias semelhantes</h2>
        <p>Utilizamos cookies essenciais para autenticação e segurança, sem os quais a Plataforma não funciona adequadamente. Também utilizamos cookies analíticos (Google Analytics) para entender o comportamento do Usuário e melhorar nossos serviços. O Usuário será informado, na primeira vez que acessar o site, sobre a utilização de cookies não essenciais e poderá optar por aceitá-los ou rejeitá-los por meio de um banner de consentimento. As preferências podem ser gerenciadas a qualquer momento nas configurações do navegador, mas a rejeição de cookies essenciais poderá prejudicar a experiência.</p>

        <h2>8. Por quanto tempo armazenamos seus dados?</h2>
        <p>Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento da conta, os dados serão excluídos ou anonimizados em até 6 (seis) meses, salvo quando houver obrigação legal de retenção (ex.: informações fiscais por 5 anos, nos termos do Código Tributário Nacional).</p>

        <h2>9. Direitos do Usuário (LGPD)</h2>
        <p>O Usuário pode, a qualquer momento e mediante requisição gratuita, solicitar:</p>
        <ul>
          <li>Confirmação da existência de tratamento.</li>
          <li>Acesso aos dados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
          <li>Portabilidade dos dados a outro fornecedor de serviço, observados os segredos comercial e industrial.</li>
          <li>Eliminação dos dados tratados com consentimento.</li>
          <li>Informação sobre as entidades com as quais compartilhamos dados.</li>
          <li>Revogação do consentimento, quando aplicável.</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato pelo e-mail <strong>contato@financasproinvest.com.br</strong>. Responderemos em até 15 (quinze) dias, conforme previsto na LGPD.</p>

        <h2>10. Medidas de segurança</h2>
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados contra acessos não autorizados, perda ou destruição, incluindo criptografia AES-256 em repouso, comunicação via HTTPS, e controles de acesso restrito. No entanto, nenhum sistema é completamente seguro; recomendamos que o Usuário também adote boas práticas de segurança, como o uso de senhas fortes e a não compartilhamento de credenciais.</p>

        <h2>11. Transferências internacionais</h2>
        <p>Seus dados podem ser transferidos e armazenados em servidores localizados fora do Brasil (ex.: Google Cloud, servidores dos provedores de IA). Adotamos cláusulas contratuais padrão aprovadas pela Autoridade Nacional de Proteção de Dados (ANPD) e garantimos que os destinatários estejam em conformidade com a LGPD, assegurando um nível de proteção adequado.</p>

        <h2>12. Alterações nesta política</h2>
        <p>Esta Política pode ser atualizada periodicamente para refletir mudanças na legislação ou nas práticas da Plataforma. A versão mais recente estará sempre disponível na Plataforma, com a data da última modificação. O uso continuado após as alterações implica aceitação das novas condições, exceto quando depender de consentimento específico.</p>

        <h2>13. Contato do Encarregado (DPO)</h2>
        <p>Para assuntos relacionados à proteção de dados, o Usuário pode contatar nosso Encarregado pelo e-mail: <strong>contato@financasproinvest.com.br</strong>.</p>
      </div>
      </div>
    </div>
  );
};