import React from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft } from 'lucide-react';

export const TermsPage = () => {
  return (
    <div className="min-h-screen bg-surface-primary dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Helmet>
          <title>Termos de Uso - Finanças Pro Invest</title>
          <meta name="description" content="Termos e condições de uso do aplicativo Finanças Pro Invest." />
        </Helmet>

        {/* Botão Voltar */}
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-8 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowLeft size={16} /> Voltar ao site
        </button>

        <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Termos de Uso</h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-8">Última atualização: 17 de fevereiro de 2026</p>
        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
        <h2>1. Definições</h2>
        <p>
          <strong>Plataforma:</strong> Aplicativo híbrido e site Finanças Pro Invest, de titularidade do Finanças Pro Invest, podendo ser contatado através do e-mail contato@financasproinvest.com.br.<br />
          <strong>Usuário:</strong> Pessoa física que utiliza a Plataforma.<br />
          <strong>Conteúdo:</strong> Informações, dados, textos, gráficos e simulações disponibilizados.<br />
          <strong>Assinatura:</strong> Planos Pro e Premium, que concedem acesso a funcionalidades adicionais mediante pagamento.
        </p>

        <h2>2. Aceitação dos Termos</h2>
        <p>Ao criar uma conta ou utilizar a Plataforma, o Usuário concorda integralmente com estes Termos. Caso discorde, não deverá utilizar os serviços.</p>

        <h2>3. Elegibilidade</h2>
        <p>O Usuário declara ser maior de 18 anos ou emancipado, com capacidade civil para contratar. Menores de idade somente poderão utilizar a Plataforma com autorização de seus responsáveis legais.</p>

        <h2>4. Cadastro e Segurança da Conta</h2>
        <p>O Usuário é responsável pela veracidade das informações fornecidas no cadastro e pela guarda de sua senha. Qualquer atividade realizada na conta será de sua inteira responsabilidade. Compromete-se a notificar imediatamente qualquer uso não autorizado.</p>

        <h2>5. Planos e Assinaturas</h2>
        <p>
          <strong>Plano Gratuito:</strong> Oferece o Controla com lançamentos ilimitados e visão básica da rotina financeira.<br />
          <strong>Plano Pro:</strong> Mediante assinatura mensal, adiciona inteligência do Nexus, histórico estendido e funcionalidades avançadas do Controla.<br />
          <strong>Plano Premium:</strong> Assinatura mensal ou anual que inclui todos os recursos do Pro, acesso estendido ao histórico para a IA Nexus e prioridade em suporte.
        </p>
        <p>Os preços e a descrição detalhada de cada plano estão disponíveis na página de planos da Plataforma.</p>

        <h2>6. Pagamentos</h2>
        <p>
          <strong>No aplicativo (Android):</strong> As assinaturas são processadas exclusivamente pelo Google Play Billing, sujeitas aos termos do Google.<br />
          <strong>No site (PWA):</strong> Os pagamentos são processados pelo Stripe, podendo ser realizados via cartão de crédito ou Pix, conforme disponibilidade.
        </p>
        <p>A assinatura será renovada automaticamente até que seja cancelada pelo Usuário, de acordo com as regras da respectiva plataforma de pagamento. O cancelamento pode ser feito a qualquer momento nas configurações da conta ou diretamente no Google Play/Stripe.</p>

        <h2>7. Reembolsos</h2>
        <p>Para assinaturas realizadas no aplicativo, aplicam-se as políticas de reembolso do Google Play. Para assinaturas realizadas no site, o Usuário poderá exercer o direito de arrependimento no prazo de 7 (sete) dias corridos, nos termos do art. 49 do Código de Defesa do Consumidor, mediante solicitação enviada para contato@financasproinvest.com.br. Caso o Usuário já tenha utilizado as funcionalidades premium durante esse período, o reembolso poderá ser parcial ou negado, considerando o benefício já usufruído, em conformidade com a interpretação atual dos órgãos de defesa do consumidor.</p>

        <h2>8. Licença de Uso</h2>
        <p>O Finanças Pro Invest concede ao Usuário uma licença limitada, não exclusiva, intransferível e revogável para acessar e utilizar a Plataforma para fins pessoais e não comerciais, de acordo com estes Termos.</p>

        <h2>9. Propriedade Intelectual</h2>
        <p>Todos os direitos sobre a Plataforma, incluindo software, marcas, logotipos, textos e layouts, são de propriedade exclusiva do Finanças Pro Invest. É vedada a reprodução, modificação ou distribuição sem autorização prévia por escrito.</p>

        <h2>10. IA Nexus – Consciência Patrimonial</h2>
        <p>A IA Nexus utiliza modelos de linguagem fornecidos por terceiros (Gemini, Mistral, OpenRouter) e dados do mercado para gerar respostas e simulações. Esses fornecedores atuam como operadores, processando os dados estritamente conforme nossas instruções e em conformidade com a LGPD. O Usuário reconhece que:</p>
        <ul>
          <li>As respostas são geradas automaticamente e podem conter imprecisões ou não refletir a realidade do mercado.</li>
          <li>Não constituem recomendação de investimento, análise financeira profissional ou aconselhamento legal.</li>
          <li>O Usuário é o único responsável pelas decisões tomadas com base nas informações fornecidas pela IA.</li>
        </ul>

        <h2>11. Condutas Proibidas</h2>
        <p>É vedado ao Usuário:</p>
        <ul>
          <li>Utilizar a Plataforma para fins ilícitos ou que violem direitos de terceiros.</li>
          <li>Tentar burlar os sistemas de segurança, limites de uso ou mecanismos de pagamento.</li>
          <li>Reproduzir, copiar ou explorar comercialmente qualquer parte da Plataforma sem autorização.</li>
          <li>Fornecer dados falsos ou de terceiros sem consentimento.</li>
        </ul>

        <h2>12. Limitação de Responsabilidade</h2>
        <p>A Plataforma é fornecida "como está", sem garantias de disponibilidade ininterrupta ou livre de erros. Em nenhuma hipótese o Finanças Pro Invest será responsável por danos indiretos, lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso da Plataforma. A responsabilidade total, em qualquer caso, estará limitada ao valor pago pelo Usuário nos últimos 12 meses.</p>

        <h2>13. Suspensão e Cancelamento</h2>
        <p>O Finanças Pro Invest reserva-se o direito de suspender ou cancelar o acesso do Usuário que violar estes Termos, sem prejuízo de outras medidas legais. O Usuário pode cancelar sua conta a qualquer momento nas configurações, ficando ciente de que os dados poderão ser mantidos por obrigação legal ou para cumprimento de auditorias.</p>

        <h2>14. Lei Aplicável e Foro</h2>
        <p>Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de Brumado/Bahia para dirimir quaisquer controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

        <h2>15. Contato</h2>
        <p>Dúvidas sobre estes Termos podem ser encaminhadas para: <strong>contato@financasproinvest.com.br</strong>.</p>
      </div>
      </div>
    </div>
  );
};