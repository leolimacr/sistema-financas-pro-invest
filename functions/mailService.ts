import { Resend } from 'resend';
import * as logger from 'firebase-functions/logger';

const FROM = 'Finanças Pro Invest <contato@financasproinvest.com.br>';

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY não configurada');
  return new Resend(key);
}

// ─── Templates HTML ────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Finanças Pro Invest</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#059669,#0284c7);padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Finanças Pro Invest</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.75);font-weight:500;">Seu acompanhamento financeiro inteligente</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
              Você está recebendo este e-mail porque tem uma conta ativa no Finanças Pro Invest.<br/>
              <a href="https://financasproinvest.com.br" style="color:#059669;text-decoration:none;">financasproinvest.com.br</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btnPrimary(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#059669;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;margin-top:20px;">${label}</a>`;
}

// ─── Funções de envio por tipo ─────────────────────────────────────

export async function sendWeeklySummary(params: {
  to: string;
  name: string;
  totalGasto: number;
  totalAnterior: number;
  topCategorias: { nome: string; valor: number }[];
  saldo: number;
}): Promise<void> {
  const { to, name, totalGasto, totalAnterior, topCategorias, saldo } = params;
  const diff = totalGasto - totalAnterior;
  const diffStr = diff > 0 ? `+R$ ${diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `-R$ ${Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const diffColor = diff > 0 ? '#dc2626' : '#059669';

  const categoriasHtml = topCategorias.slice(0, 3).map(c =>
    `<tr>
      <td style="padding:6px 0;font-size:13px;color:#374151;">${c.nome}</td>
      <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:700;text-align:right;">R$ ${c.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
    </tr>`
  ).join('');

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Resumo da semana, ${name}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Aqui está o que aconteceu nas suas finanças nos últimos 7 dias.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td width="48%" style="background:#f0fdf4;border-radius:8px;padding:16px;border:1px solid #bbf7d0;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Total gasto</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">R$ ${totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p style="margin:4px 0 0;font-size:12px;color:${diffColor};font-weight:600;">${diffStr} vs semana anterior</p>
        </td>
        <td width="4%"></td>
        <td width="48%" style="background:#eff6ff;border-radius:8px;padding:16px;border:1px solid #bfdbfe;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px;">Dinheiro do mês</p>
          <p style="margin:0;font-size:22px;font-weight:800;color:#111827;">R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </td>
      </tr>
    </table>

      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Maiores gastos da semana</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;">
      ${categoriasHtml}
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">
      No app, acompanhe sua <strong>folga do mês</strong> e o <strong>Saldo Livre Real</strong> com mais detalhe.
    </p>
    ${btnPrimary('Ver relatório completo', 'https://www.financasproinvest.com.br/app/dashboard?origin=email_weekly_summary')}
  `;

  await dispatch(to, 'Seu resumo financeiro da semana', content);
}

export async function sendInactivityAlert(params: {
  to: string;
  name: string;
  diasSemRegistro: number;
}): Promise<void> {
  const { to, name, diasSemRegistro } = params;

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Tudo bem, ${name}?</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Sentimos sua falta por aqui.</p>

    <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#713f12;line-height:1.6;">
        Faz <strong>${diasSemRegistro} dias</strong> que você não registra nenhum lançamento. Seus dados podem estar desatualizados, o que torna o acompanhamento menos preciso.
      </p>
    </div>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Registrar um lançamento leva menos de 30 segundos. Manter o hábito é o que transforma o controle financeiro em resultado real.
    </p>
    ${btnPrimary('Registrar agora', 'https://www.financasproinvest.com.br/app/controla?action=new-transaction&origin=email_inactivity')}
  `;

  await dispatch(to, `${name}, seus dados financeiros precisam de atualização`, content);
}

export async function sendMonthlyClose(params: {
  to: string;
  name: string;
  mes: string;
  saldo: number;
  totalReceitas: number;
  totalDespesas: number;
  maiorCategoria: string;
}): Promise<void> {
  const { to, name, mes, saldo, totalReceitas, totalDespesas, maiorCategoria } = params;
  const positivo = saldo >= 0;

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">${mes} encerrado, ${name}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Veja como foram suas finanças no mês.</p>

    <div style="background:${positivo ? '#f0fdf4' : '#fef2f2'};border:1px solid ${positivo ? '#bbf7d0' : '#fecaca'};border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${positivo ? '#059669' : '#dc2626'};text-transform:uppercase;">Dinheiro do mês</p>
      <p style="margin:0;font-size:32px;font-weight:800;color:${positivo ? '#059669' : '#dc2626'};">${positivo ? '+' : ''}R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border-top:1px solid #e5e7eb;">
      <tr>
        <td style="padding:10px 0;font-size:13px;color:#374151;">Total de receitas</td>
        <td style="padding:10px 0;font-size:13px;color:#059669;font-weight:700;text-align:right;">R$ ${totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr style="border-top:1px solid #f3f4f6;">
        <td style="padding:10px 0;font-size:13px;color:#374151;">Total de despesas</td>
        <td style="padding:10px 0;font-size:13px;color:#dc2626;font-weight:700;text-align:right;">R$ ${totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr style="border-top:1px solid #f3f4f6;">
        <td style="padding:10px 0;font-size:13px;color:#374151;">Maior categoria de gasto</td>
        <td style="padding:10px 0;font-size:13px;color:#111827;font-weight:700;text-align:right;">${maiorCategoria}</td>
      </tr>
    </table>
    ${btnPrimary('Ver análise completa', 'https://www.financasproinvest.com.br/app/dashboard?origin=email_monthly_close')}
  `;

  await dispatch(to, `Fechamento de ${mes} — veja seu resultado`, content);
}

export async function sendDebtDueAlert(params: {
  to: string;
  name: string;
  debtName: string;
  dueDate: string;
  amount: number;
  diffDays: number;
}): Promise<void> {
  const { to, name, debtName, dueDate, amount, diffDays } = params;

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Vencimento próximo, ${name}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Uma das suas dívidas vence em breve.</p>

    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:16px;font-weight:800;color:#111827;">${debtName}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#374151;">Vencimento: <strong>${dueDate}</strong> — em ${diffDays} dia${diffDays > 1 ? 's' : ''}</p>
      <p style="margin:0;font-size:13px;color:#374151;">Valor: <strong>R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
    </div>
    ${btnPrimary('Revisar dívidas', 'https://www.financasproinvest.com.br/app/minhas-dividas?view=estrategia&origin=email_debt_due')}
  `;

  await dispatch(to, `${debtName} vence em ${diffDays} dia${diffDays > 1 ? 's' : ''}`, content);
}

export async function sendGoalAportAlert(params: {
  to: string;
  name: string;
  goalName: string;
  amount: number;
}): Promise<void> {
  const { to, name, goalName, amount } = params;

  const content = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">Lembrete de aporte, ${name}</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Seu próximo aporte está agendado para amanhã.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Meta</p>
      <p style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827;">${goalName}</p>
      <p style="margin:0;font-size:24px;font-weight:800;color:#059669;">R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
    </div>
    ${btnPrimary('Ver minhas metas', 'https://www.financasproinvest.com.br/app/metas?origin=email_goal_aport')}
  `;

  await dispatch(to, `Aporte de amanhã: ${goalName}`, content);
}

export async function sendPixUnderpaidNotification(params: {
  to: string;
  name?: string;
  amountPaid: number;
  planName: string;
  planPrice: number;
}): Promise<void> {
  const { to, name, amountPaid, planName, planPrice } = params;
  const userName = name || 'Investidor(a)';

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Atenção ao seu pagamento Pix, ${userName}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
      Identificamos o envio de um comprovante no valor de <strong>R$ ${amountPaid.toFixed(2).replace('.', ',')}</strong>, que é inferior ao valor do plano <strong>${planName}</strong> (R$ ${planPrice.toFixed(2).replace('.', ',')}).
    </p>

    <div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">Política de Devolução</p>
      <p style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
        Para sua total segurança e transparência, se o valor transferido entrou de fato em nossa conta bancária, faremos a devolução em <strong>até 2 dias</strong> para a chave Pix em seu nome informada no aplicativo.
      </p>
    </div>

    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
      Acesse o aplicativo do Finanças Pro Invest para registrar a sua chave Pix ou realizar um novo pagamento com o valor correto.
    </p>
    ${btnPrimary('Acessar Finanças Pro Invest', 'https://financasproinvest.com.br')}
  `;

  await dispatch(to, 'Atenção ao Pagamento Pix — Finanças Pro Invest', content);
}

export async function sendPixRefundCompletedNotification(params: {
  to: string;
  name?: string;
  amountRefunded: number;
  pixKey: string;
}): Promise<void> {
  const { to, name, amountRefunded, pixKey } = params;
  const userName = name || 'Investidor(a)';

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#059669;">Devolução Pix Realizada com Sucesso!</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
      Olá, ${userName}. Confirmamos que o Pix de devolução no valor de <strong>R$ ${amountRefunded.toFixed(2).replace('.', ',')}</strong> foi realizado com sucesso.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Dados da Devolução</p>
      <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#111827;">R$ ${amountRefunded.toFixed(2).replace('.', ',')}</p>
      <p style="margin:0;font-size:13px;color:#374151;">Chave Pix: <strong>${pixKey}</strong></p>
    </div>

    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
      O Finanças Pro Invest agradece a sua compreensão. Caso deseje ativar o seu plano Pro ou Premium, basta acessar a página de planos e realizar a transferência no valor exato.
    </p>
    ${btnPrimary('Conhecer os Planos', 'https://financasproinvest.com.br/precos')}
  `;

  await dispatch(to, 'Devolução Pix Realizada — Finanças Pro Invest', content);
}

// ─── Dispatcher interno ────────────────────────────────────────────

async function dispatch(to: string, subject: string, content: string): Promise<void> {
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html: baseLayout(content),
    });
    if (error) {
      logger.error('[MailService] Resend error:', error);
    } else {
      logger.info(`[MailService] Enviado para ${to} — "${subject}"`);
    }
  } catch (err: any) {
    logger.error('[MailService] Falha ao enviar:', err.message);
  }
}
