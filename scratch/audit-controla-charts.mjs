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
  const port = 9674;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-controla-charts')}`,
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

    await sleep(2000);
    // Configura sessão demo e tema dark
    await evaluate(`(() => {
      sessionStorage.setItem('fpi_demo_mode', 'true');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);

    console.log('\nNavegando para /app/controla...');
    await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
    
    // Aguarda carregar
    for (let i = 0; i < 20; i++) {
      await sleep(600);
      const isLoaded = await evaluate(`!document.querySelector('.app-loading-screen') && Boolean(document.querySelector('h1, h2, h3'))`);
      if (isLoaded) break;
    }

    await sleep(1500);

    // Scroll para baixo até os gráficos
    const scrollInfo = await evaluate(`(() => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const pesoH3 = h3s.find(h => h.textContent.includes('pesa') || h.textContent.includes('foi') || h.textContent.includes('dinheiro'));
      if (pesoH3) {
        pesoH3.scrollIntoView({ behavior: 'instant', block: 'center' });
        return { found: true, text: pesoH3.textContent.trim() };
      }
      return { found: false, h3s: h3s.map(h => h.textContent.trim()) };
    })()`);
    console.log('Scroll info:', scrollInfo);

    await sleep(800);

    const chartsData = await evaluate(`(() => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const pesoH3 = h3s.find(h => h.textContent.includes('pesa') || h.textContent.includes('foi') || h.textContent.includes('dinheiro'));
      const pressaoH3 = h3s.find(h => h.textContent.includes('Pressão') || h.textContent.includes('fluxo') || h.textContent.includes('Visão de fluxo'));

      function inspect(h3) {
        if (!h3) return null;
        const card = h3.closest('.rounded-section') || h3.parentElement;
        const cs = window.getComputedStyle(card);
        const h3cs = window.getComputedStyle(h3);
        const p = card.querySelector('p, span');
        const pcs = p ? window.getComputedStyle(p) : null;
        return {
          title: h3.textContent.trim(),
          classes: card.className,
          computedBg: cs.backgroundColor,
          computedColor: cs.color,
          computedBorder: cs.borderColor,
          h3Color: h3cs.color,
          subColor: pcs ? pcs.color : null
        };
      }

      return {
        painel1_onde_o_dinheiro_pesa: inspect(pesoH3),
        painel2_pressao_nas_contas: inspect(pressaoH3),
        htmlClass: document.documentElement.className
      };
    })()`);
    console.log('Dados computados dos painéis 1 e 2 em /app/controla:', JSON.stringify(chartsData, null, 2));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/panel-1-2-controla-charts-dark.png', Buffer.from(ss.result.data, 'base64'));
    console.log('Screenshot salva: panel-1-2-controla-charts-dark.png');

  } finally {
    proc.kill();
  }
}

run().catch(console.error);
