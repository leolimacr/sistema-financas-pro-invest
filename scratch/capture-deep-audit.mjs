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
  const port = 9672;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-deep-audit')}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1440,900',
    'about:blank'
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

    async function applyTheme(th) {
      await evaluate(`(() => {
        localStorage.setItem('fpi_theme', '${th}');
        if ('${th}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      })()`);
      await sleep(400);
    }

    async function captureFullPage(name) {
      // Usar captureScreenshot com captureBeyondViewport
      const metrics = await send('Page.getLayoutMetrics');
      const width = metrics.result.contentSize.width || 1440;
      const height = metrics.result.contentSize.height || 2000;

      // Opção 1: setDeviceMetricsOverride para capturar página inteira
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: Math.min(height, 5000),
        deviceScaleFactor: 1,
        mobile: false
      });
      await sleep(500);

      const ss = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const fpath = path.join('scratch', 'homologation-screenshots', `${name}.png`);
      fs.writeFileSync(fpath, Buffer.from(ss.result.data, 'base64'));
      console.log(`Screenshot full-page salva: ${name}.png (${fs.statSync(fpath).size} bytes, altura ${height}px)`);

      // Restaurar viewport normal
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false
      });
      await sleep(200);
    }

    // Configura sessão demo autenticada
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);
    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);

    // 1. INSPECIONAR /app/central (PROTEÇÃO FINANCEIRA)
    console.log('\n--- 1. INSPECIONANDO /app/central (Proteção Financeira) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
    await sleep(3000);
    await applyTheme('dark');

    // Inspecionar cores computadas de ProtectionBar
    const protectionStyles = await evaluate(`(() => {
      const h3 = Array.from(document.querySelectorAll('h3')).find(el => el.textContent.includes('Proteção Financeira'));
      if (!h3) return { error: 'h3 Proteção Financeira não encontrado' };
      const card = h3.closest('.rounded-section') || h3.closest('div[class*="rounded"]');
      const cs = window.getComputedStyle(card);
      const h3cs = window.getComputedStyle(h3);
      const track = card.querySelector('.rounded-full');
      const trackCs = track ? window.getComputedStyle(track) : null;
      return {
        cardTag: card.tagName,
        cardClasses: card.className,
        cardBg: cs.backgroundColor,
        cardColor: cs.color,
        cardBorder: cs.borderColor,
        h3Color: h3cs.color,
        trackBg: trackCs ? trackCs.backgroundColor : 'none',
        htmlClass: document.documentElement.className
      };
    })()`);
    console.log('Estilos computados do painel "Proteção Financeira":', JSON.stringify(protectionStyles, null, 2));
    await captureFullPage('audit-deep-central-dark-full');

    // 2. INSPECIONAR /app/dashboard (ONDE O DINHEIRO PESA & PRESSÃO NAS CONTAS)
    console.log('\n--- 2. INSPECIONANDO /app/dashboard (Onde o dinheiro pesa & Pressão nas contas) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/dashboard' });
    await sleep(3000);
    await applyTheme('dark');

    const chartStyles = await evaluate(`(() => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const peso = h3s.find(el => el.textContent.includes('pesa') || el.textContent.includes('foi'));
      const pressao = h3s.find(el => el.textContent.includes('Pressão') || el.textContent.includes('fluxo'));

      function getInfo(h3) {
        if (!h3) return null;
        const card = h3.closest('.rounded-section') || h3.closest('div[class*="rounded"]');
        const cs = window.getComputedStyle(card);
        const h3cs = window.getComputedStyle(h3);
        return {
          title: h3.textContent.trim(),
          cardClasses: card.className,
          cardBg: cs.backgroundColor,
          cardColor: cs.color,
          cardBorder: cs.borderColor,
          h3Color: h3cs.color
        };
      }

      return {
        peso: getInfo(peso),
        pressao: getInfo(pressao),
        htmlClass: document.documentElement.className
      };
    })()`);
    console.log('Estilos computados de "Onde o dinheiro pesa" e "Pressão nas contas":', JSON.stringify(chartStyles, null, 2));
    await captureFullPage('audit-deep-dashboard-dark-full');

    // 3. INSPECIONAR /app/mais (PERFIL, ASSINATURA, INDICAÇÃO)
    console.log('\n--- 3. INSPECIONANDO /app/mais (Perfil, Assinatura, Indicação) ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/mais' });
    await sleep(2500);
    await applyTheme('dark');

    const maisStyles = await evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.rounded-\\[2rem\\]'));
      return cards.map(c => {
        const cs = window.getComputedStyle(c);
        const h = c.querySelector('h2, h3, h4');
        return {
          title: h ? h.textContent.trim() : 'sem titulo',
          classes: c.className,
          bg: cs.backgroundColor,
          color: cs.color,
          border: cs.borderColor
        };
      });
    })()`);
    console.log('Estilos computados dos cards em /app/mais:', JSON.stringify(maisStyles, null, 2));
    await captureFullPage('audit-deep-mais-dark-full');

    // 4. INSPECIONAR /app/controla EM MODO ESCURO
    console.log('\n--- 4. INSPECIONANDO /app/controla ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
    await sleep(2500);
    await applyTheme('dark');
    await captureFullPage('audit-deep-controla-dark-full');

    // 5. INSPECIONAR /app/agenda EM MODO ESCURO
    console.log('\n--- 5. INSPECIONANDO /app/agenda ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/agenda' });
    await sleep(2500);
    await applyTheme('dark');
    await captureFullPage('audit-deep-agenda-dark-full');

  } finally {
    proc.kill();
  }
}

run().catch(console.error);
