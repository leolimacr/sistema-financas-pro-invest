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

async function startChrome(port, initialUrl) {
  const chromePath = findChromePath();
  const profileDir = path.join(process.cwd(), 'scratch', `cdp-profile-devclicks-${port}`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1440,900',
    initialUrl
  ]);

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

  return { proc, send, evaluate, close: () => { try { ws.close(); } catch {}; try { proc.kill(); } catch {}; } };
}

const EXTRACT_METRICS_EXPR = `(() => {
  const h = document.querySelector('header');
  const hero = document.querySelector('.rounded-panel');
  const aside = document.querySelector('aside');
  const root = document.getElementById('root');
  const body = document.body;

  const btns = Array.from(document.querySelectorAll('header button')).filter(b => 
    b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')
  ).map(b => {
    const svg = b.querySelector('svg');
    const svgHtml = svg ? svg.outerHTML : '';
    let icon = 'Other';
    if (svgHtml.includes('circle cx="12" cy="12" r="5"') || svgHtml.includes('M12 2v2') || svgHtml.includes('M12 3v1') || svg?.classList.contains('lucide-sun')) {
      icon = 'Sol (representa próxima ação ou modo)';
    } else if (svgHtml.includes('M21 12.79A9 9') || svgHtml.includes('path d="M21 12.79') || svg?.classList.contains('lucide-moon')) {
      icon = 'Lua (representa próxima ação ou modo)';
    }
    return {
      title: b.getAttribute('title'),
      aria: b.getAttribute('aria-label'),
      visible: b.offsetWidth > 0 && b.offsetHeight > 0,
      icon
    };
  });

  return {
    origin: window.location.origin,
    url: window.location.href,
    viewportWidth: window.innerWidth,
    fpi_theme: localStorage.getItem('fpi_theme'),
    htmlClass: document.documentElement.className,
    colorScheme: document.documentElement.style.colorScheme,
    body: {
      bg: window.getComputedStyle(body).backgroundColor,
      color: window.getComputedStyle(body).color
    },
    root: {
      bg: root ? window.getComputedStyle(root).backgroundColor : 'none',
      color: root ? window.getComputedStyle(root).color : 'none'
    },
    header: {
      bg: h ? window.getComputedStyle(h).backgroundColor : 'none',
      color: h ? window.getComputedStyle(h).color : 'none',
      border: h ? window.getComputedStyle(h).borderColor : 'none'
    },
    sidebar: {
      bg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      color: aside ? window.getComputedStyle(aside).color : 'none',
      border: aside ? window.getComputedStyle(aside).borderColor : 'none'
    },
    hero: {
      bg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      color: hero ? window.getComputedStyle(hero).color : 'none',
      border: hero ? window.getComputedStyle(hero).borderColor : 'none'
    },
    themeButtons: btns
  };
})()`;

async function testServer(baseUrl, label, port) {
  console.log(`\n========================================================`);
  console.log(`TESTANDO: ${label} (${baseUrl})`);
  console.log(`========================================================`);

  const client = await startChrome(port, `${baseUrl}/`);
  const { send, evaluate, close } = client;

  await sleep(2000);
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  // Force initial state to dark so test begins in Dark
  await evaluate(`localStorage.setItem('fpi_theme', 'dark'); document.documentElement.classList.add('dark');`);

  await send('Page.navigate', { url: `${baseUrl}/app/central` });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    const isHero = await evaluate(`!!document.querySelector('.rounded-panel')`);
    if (isHero) {
      ready = true;
      break;
    }
    await sleep(500);
  }

  if (!ready) {
    console.error(`Erro: Cockpit não renderizou em ${label}`);
    close();
    return null;
  }

  // 1. Estado Inicial (Escuro)
  console.log(`\n[${label}] --- 1. ESTADO INICIAL (ESCURO) ---`);
  const initMetrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(JSON.stringify(initMetrics, null, 2));

  const ssInit = await send('Page.captureScreenshot', { format: 'png' });
  if (ssInit?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-fresh-state0-dark.png`), Buffer.from(ssInit.result.data, 'base64'));
  }

  // 2. Clique 1: Escuro -> Claro
  console.log(`\n[${label}] --- CLIQUE 1: Escuro -> Claro ---`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const after1Metrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(JSON.stringify(after1Metrics, null, 2));

  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss1?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-fresh-state1-light.png`), Buffer.from(ss1.result.data, 'base64'));
  }

  // 3. Clique 2: Claro -> Escuro
  console.log(`\n[${label}] --- CLIQUE 2: Claro -> Escuro ---`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const after2Metrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(JSON.stringify(after2Metrics, null, 2));

  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss2?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-fresh-state2-dark.png`), Buffer.from(ss2.result.data, 'base64'));
  }

  close();
  return { initMetrics, after1Metrics, after2Metrics };
}

async function run() {
  // Test Dev server (port 5173)
  const devRes = await testServer('http://localhost:5173', 'dev-server', 9444);
  // Test Preview server (port 4173)
  const previewRes = await testServer('http://localhost:4173', 'preview-server', 9445);

  console.log('\n================== RESUMO COMPARATIVO ==================');
  console.log('DEV SERVER:');
  console.log('State 0 (Dark)  : htmlClass =', devRes?.initMetrics?.htmlClass, '| body.bg =', devRes?.initMetrics?.body?.bg, '| header.bg =', devRes?.initMetrics?.header?.bg, '| hero.bg =', devRes?.initMetrics?.hero?.bg);
  console.log('State 1 (Light) : htmlClass =', devRes?.after1Metrics?.htmlClass, '| body.bg =', devRes?.after1Metrics?.body?.bg, '| header.bg =', devRes?.after1Metrics?.header?.bg, '| hero.bg =', devRes?.after1Metrics?.hero?.bg);
  console.log('State 2 (Dark)  : htmlClass =', devRes?.after2Metrics?.htmlClass, '| body.bg =', devRes?.after2Metrics?.body?.bg, '| header.bg =', devRes?.after2Metrics?.header?.bg, '| hero.bg =', devRes?.after2Metrics?.hero?.bg);

  console.log('\nPREVIEW SERVER:');
  console.log('State 0 (Dark)  : htmlClass =', previewRes?.initMetrics?.htmlClass, '| body.bg =', previewRes?.initMetrics?.body?.bg, '| header.bg =', previewRes?.initMetrics?.header?.bg, '| hero.bg =', previewRes?.initMetrics?.hero?.bg);
  console.log('State 1 (Light) : htmlClass =', previewRes?.after1Metrics?.htmlClass, '| body.bg =', previewRes?.after1Metrics?.body?.bg, '| header.bg =', previewRes?.after1Metrics?.header?.bg, '| hero.bg =', previewRes?.after1Metrics?.hero?.bg);
  console.log('State 2 (Dark)  : htmlClass =', previewRes?.after2Metrics?.htmlClass, '| body.bg =', previewRes?.after2Metrics?.body?.bg, '| header.bg =', previewRes?.after2Metrics?.header?.bg, '| hero.bg =', previewRes?.after2Metrics?.hero?.bg);
}

run().catch(console.error);
