import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

function findChromePath() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Users\\' + (process.env.USERNAME || 'leoli') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return 'chrome.exe';
}

function getWsUrl(port) {
  return new Promise((resolve, reject) => {
    let retries = 0;
    const interval = setInterval(() => {
      http.get(`http://127.0.0.1:${port}/json`, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            const list = JSON.parse(raw);
            const page = list.find(t => t.type === 'page') || list[0];
            if (page && page.webSocketDebuggerUrl) {
              clearInterval(interval);
              resolve(page.webSocketDebuggerUrl);
            }
          } catch {}
        });
      }).on('error', () => {
        if (++retries > 30) {
          clearInterval(interval);
          reject(new Error(`Timeout aguardando CDP na porta ${port}`));
        }
      });
    }, 250);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const port = 9667;
  const chromePath = findChromePath();
  const profileDir = path.join(process.cwd(), 'scratch', 'cdp-profile-remaining');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const screenshotDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:5173/'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const ws = new WebSocket(wsUrl);

    let idCounter = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };

    await new Promise(r => ws.onopen = r);

    function send(method, params = {}) {
      const id = idCounter++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    async function applyTheme(theme) {
      await evaluate(`(() => {
        localStorage.setItem('fpi_theme', '${theme}');
        if ('${theme}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      })()`);
      await sleep(400);
    }

    async function takeScreenshot(filename) {
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      if (ss?.result?.data) {
        const fullPath = path.join(screenshotDir, filename);
        fs.writeFileSync(fullPath, Buffer.from(ss.result.data, 'base64'));
        console.log(`Salvo: ${filename} (${fs.statSync(fullPath).size} bytes)`);
      }
    }

    console.log('--- 1. PÁGINAS PÚBLICAS LIMPAS (SEM SESSÃO DEMO) ---');
    // Limpar sessionStorage
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);
    await evaluate(`sessionStorage.clear()`);

    // Item 1: Public Home
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-1-public_home__web_-${theme}.png`);
    }

    // Item 4: Register
    await send('Page.navigate', { url: 'http://localhost:5173/register' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-4-autentica__o__cadastro_-${theme}.png`);
    }

    console.log('--- 2. ATIVAR MODO DEMO E NAVEGAR ROTAS AUTENTICADAS ---');
    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);

    // Item 21: Discovery Hub (/app/explorar)
    await send('Page.navigate', { url: 'http://localhost:5173/app/explorar' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-21-discovery_hub-${theme}.png`);
    }

    // Item 23: Configurações (/app/mais)
    await send('Page.navigate', { url: 'http://localhost:5173/app/mais' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-23-configura__es__mais_-${theme}.png`);
    }

    // Item 25: Carteira Soberana (/app/carteira)
    await send('Page.navigate', { url: 'http://localhost:5173/app/carteira' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-25-carteira_soberana-${theme}.png`);
    }

    // Item 29: Gestão de Metas (/app/metas)
    await send('Page.navigate', { url: 'http://localhost:5173/app/metas' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-29-gest_o_de_metas-${theme}.png`);
    }

    console.log('--- 3. MODAIS & GAVETAS INTERATIVAS REAIS ---');

    // Item 43: BucketDetailDrawer na Central
    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
    await sleep(2500);
    // Clica no card de balde (ex: Contas do Mês ou Colchão)
    const clickedBucket = await evaluate(`(() => {
      const el = document.querySelector('[role="button"][aria-label*="Contas"]') ||
                 document.querySelector('[role="button"][aria-label*="Colchão"]') ||
                 document.querySelector('.rounded-item[role="button"]');
      if (el) { el.click(); return true; }
      return false;
    })()`);
    console.log(`Item 43 - Card de balde clicado: ${clickedBucket}`);
    await sleep(1000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-43-baldes_gaveta_detalhes-${theme}.png`);
    }

    // Item 39: CommandCalibration em /app/mais
    await send('Page.navigate', { url: 'http://localhost:5173/app/mais' });
    await sleep(2000);
    const clickedCalibration = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const calBtn = btns.find(b => b.textContent && b.textContent.includes('Recalibrar Inteligência'));
      if (calBtn) { calBtn.click(); return true; }
      return false;
    })()`);
    console.log(`Item 39 - Botão Recalibrar Inteligência clicado: ${clickedCalibration}`);
    await sleep(1000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-39-calibracao_comando-${theme}.png`);
    }

    // Item 35: Agenda Modais
    await send('Page.navigate', { url: 'http://localhost:5173/app/agenda' });
    await sleep(2000);

    // 35a: AgendaCalendarModal
    const clickedCalModal = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      // O botão de calendário do mês tem o ícone de calendário ou title correspondente
      const calBtn = btns.find(b => b.title && b.title.includes('Selecionar mês')) ||
                     btns.find(b => b.querySelector('svg.lucide-calendar') && b.textContent.trim() === '');
      if (calBtn) { calBtn.click(); return true; }
      return false;
    })()`);
    console.log(`Item 35a - Botão AgendaCalendarModal clicado: ${clickedCalModal}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-35-agenda_modal_calendario-${theme}.png`);
    }
    // Fechar AgendaCalendarModal
    await evaluate(`(() => {
      const closeBtn = document.querySelector('[role="dialog"] button');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(500);

    // 35b: AgendaShortcutModal
    const clickedShortcut = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const scBtn = btns.find(b => b.textContent && b.textContent.includes('Atalho'));
      if (scBtn) { scBtn.click(); return true; }
      return false;
    })()`);
    console.log(`Item 35b - Botão AgendaShortcutModal clicado: ${clickedShortcut}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-35-agenda_modal_atalho-${theme}.png`);
    }

    // Item 32: Carteira Modais em /app/carteira
    await send('Page.navigate', { url: 'http://localhost:5173/app/carteira' });
    await sleep(2000);

    // 32a: AssetModal (Novo Ativo)
    const clickedNovoAtivo = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Novo Ativo'));
      if (b) { b.click(); return true; }
      return false;
    })()`);
    console.log(`Item 32a - Botão Novo Ativo clicado: ${clickedNovoAtivo}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-32-carteira_modal_novo_ativo-${theme}.png`);
    }
    // Fechar modal
    await evaluate(`(() => {
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      window.dispatchEvent(esc);
    })()`);
    await sleep(500);

    // 32b: ClassTargetsModal (Metas)
    const clickedMetas = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Metas'));
      if (b) { b.click(); return true; }
      return false;
    })()`);
    console.log(`Item 32b - Botão Metas clicado: ${clickedMetas}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-32-carteira_modal_metas-${theme}.png`);
    }
    await evaluate(`(() => {
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      window.dispatchEvent(esc);
    })()`);
    await sleep(500);

    // 32c: ImportSpreadsheetModal (Importar)
    const clickedImportar = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Importar'));
      if (b) { b.click(); return true; }
      return false;
    })()`);
    console.log(`Item 32c - Botão Importar clicado: ${clickedImportar}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-32-carteira_modal_importar-${theme}.png`);
    }
    await evaluate(`(() => {
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      window.dispatchEvent(esc);
    })()`);
    await sleep(500);

    // 32d: ConnectInstitutionsModal (Conectar)
    const clickedConectar = await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(btn => btn.textContent && btn.textContent.includes('Conectar'));
      if (b) { b.click(); return true; }
      return false;
    })()`);
    console.log(`Item 32d - Botão Conectar clicado: ${clickedConectar}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-32-carteira_modal_conectar-${theme}.png`);
    }
    await evaluate(`(() => {
      const esc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      window.dispatchEvent(esc);
    })()`);
    await sleep(500);

    // Item 42: FeatureGate fallback (PremiumUpgradePrompt)
    await send('Page.navigate', { url: 'http://localhost:5173/app/investimentos' });
    await sleep(2000);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-42-gating_upgrade_prompt-${theme}.png`);
    }

    // Item 19: DayExpensesModal no Calendário
    await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
    await sleep(2500);
    // Ativa visão de calendário se estiver em lista
    await evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const calBtn = btns.find(b => b.textContent && b.textContent.includes('Calendário'));
      if (calBtn) calBtn.click();
    })()`);
    await sleep(1000);
    // Clica no primeiro dia que contenha despesa
    const clickedDay = await evaluate(`(() => {
      const days = Array.from(document.querySelectorAll('[role="button"]'));
      const expenseDay = days.find(d => d.textContent && d.textContent.includes('R$'));
      if (expenseDay) { expenseDay.click(); return true; }
      return false;
    })()`);
    console.log(`Item 19 - Dia do calendário clicado: ${clickedDay}`);
    await sleep(800);
    for (const theme of ['light', 'dark']) {
      await applyTheme(theme);
      await takeScreenshot(`item-19-calendario_detalhe_dia-${theme}.png`);
    }

    console.log('--- Homologação dos estados restantes finalizada com sucesso! ---');
  } finally {
    proc.kill();
  }
}

main().catch(err => {
  console.error('Falha na execução:', err);
  process.exit(1);
});
