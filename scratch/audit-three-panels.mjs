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
          reject(new Error('Timeout'));
        }
      });
    }, 250);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const port = 9673;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-panels')}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1440,1200',
    'http://localhost:5173/'
  ]);

  try {
    const wsUrl = await getWsUrl(port);
    const ws = new WebSocket(wsUrl);
    let idCounter = 1;
    const pending = new Map();
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
    };
    await new Promise(r => ws.onopen = r);
    function send(method, params = {}) {
      const id = idCounter++;
      return new Promise(r => {
        pending.set(id, r);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }
    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return res.result?.result?.value;
    }
    await send('Page.enable');
    await send('Runtime.enable');

    // 1. Injetar fpi_demo_mode e fpi_theme
    await sleep(2000);
    await evaluate(`(() => {
      sessionStorage.setItem('fpi_demo_mode', 'true');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);

    // Função de espera por elemento visível
    async function waitForElement(selector, maxTries = 30) {
      for (let i = 0; i < maxTries; i++) {
        const found = await evaluate(`Boolean(document.querySelector('${selector}'))`);
        const loading = await evaluate(`Boolean(document.querySelector('.app-loading-screen'))`);
        if (found && !loading) return true;
        await sleep(500);
      }
      return false;
    }

    // ----------------------------------------------------
    // TESTE 1: /app/central -> Proteção Financeira
    // ----------------------------------------------------
    console.log('\n=== TESTANDO /app/central (Proteção Financeira) ===');
    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
    await waitForElement('section[aria-label="Base de Proteção e Métricas"], #base-protecao');
    await sleep(1500);

    // Scroll até a seção de proteção
    await evaluate(`(() => {
      const sec = document.getElementById('base-protecao');
      if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(800);

    const protData = await evaluate(`(() => {
      const sec = document.getElementById('base-protecao');
      if (!sec) return { error: '#base-protecao não encontrado' };
      const card = sec.querySelector('.rounded-section') || sec.firstElementChild;
      const cs = window.getComputedStyle(card);
      const h3 = card.querySelector('h3');
      const h3cs = h3 ? window.getComputedStyle(h3) : null;
      const textMuted = card.querySelector('.text-text-muted');
      const mutedCs = textMuted ? window.getComputedStyle(textMuted) : null;
      const track = card.querySelector('.rounded-full');
      const trackCs = track ? window.getComputedStyle(track) : null;

      return {
        classes: card.className,
        computedBg: cs.backgroundColor,
        computedColor: cs.color,
        computedBorder: cs.borderColor,
        h3Text: h3 ? h3.textContent.trim() : null,
        h3Color: h3cs ? h3cs.color : null,
        mutedColor: mutedCs ? mutedCs.color : null,
        trackBg: trackCs ? trackCs.backgroundColor : null,
        htmlClass: document.documentElement.className
      };
    })()`);
    console.log('Painel 3: Proteção Financeira (Central):', protData);

    const ssProt = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/panel-3-protecao-financeira-dark.png', Buffer.from(ssProt.result.data, 'base64'));
    console.log('Salvo: panel-3-protecao-financeira-dark.png');

    // ----------------------------------------------------
    // TESTE 2: /app/controla -> DashboardCharts (Onde o dinheiro pesa & Pressão nas contas)
    // ----------------------------------------------------
    console.log('\n=== TESTANDO /app/controla (DashboardCharts) ===');
    await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
    await waitForElement('button');
    await sleep(2000);

    // No ControlaPage, se estiver na visão Lista, clica no botão para ver se DashboardCharts aparece ou se é em /app/dashboard
    // Vamos rolar a página inteira para baixo
    await evaluate(`(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    })()`);
    await sleep(1000);

    // ----------------------------------------------------
    // TESTE 3: /app/dashboard (Página dedicada do Dashboard do Mês)
    // ----------------------------------------------------
    console.log('\n=== TESTANDO /app/dashboard ===');
    await send('Page.navigate', { url: 'http://localhost:5173/app/dashboard' });
    await sleep(3000);

    // Scroll para baixo onde ficam os gráficos
    await evaluate(`(() => {
      window.scrollTo(0, 700);
    })()`);
    await sleep(1000);

    const chartsData = await evaluate(`(() => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const pesoH3 = h3s.find(h => h.textContent.includes('pesa') || h.textContent.includes('foi'));
      const pressaoH3 = h3s.find(h => h.textContent.includes('Pressão') || h.textContent.includes('fluxo'));

      function inspect(h3) {
        if (!h3) return null;
        const card = h3.closest('.rounded-section') || h3.parentElement;
        const cs = window.getComputedStyle(card);
        const h3cs = window.getComputedStyle(h3);
        const subtext = card.querySelector('p, span');
        const subCs = subtext ? window.getComputedStyle(subtext) : null;
        return {
          title: h3.textContent.trim(),
          classes: card.className,
          computedBg: cs.backgroundColor,
          computedColor: cs.color,
          computedBorder: cs.borderColor,
          h3Color: h3cs.color,
          subColor: subCs ? subCs.color : null
        };
      }

      return {
        painel1_onde_o_dinheiro_pesa: inspect(pesoH3),
        painel2_pressao_nas_contas: inspect(pressaoH3),
        htmlClass: document.documentElement.className
      };
    })()`);
    console.log('Painéis 1 e 2: DashboardCharts (Dashboard):', JSON.stringify(chartsData, null, 2));

    const ssCharts = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/panel-1-2-dashboard-charts-dark.png', Buffer.from(ssCharts.result.data, 'base64'));
    console.log('Salvo: panel-1-2-dashboard-charts-dark.png');

  } finally {
    proc.kill();
  }
}

run().catch(console.error);
