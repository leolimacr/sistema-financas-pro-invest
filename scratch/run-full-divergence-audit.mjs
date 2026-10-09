import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl(port) {
  for (let i = 0; i < 30; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let b = '';
          res.on('data', d => b += d);
          res.on('end', () => resolve(b));
        }).on('error', reject);
      });
      const list = JSON.parse(data);
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {}
    await sleep(300);
  }
  throw new Error(`Could not connect to Chrome on port ${port}`);
}

async function startChrome(port, initialUrl) {
  const profileDir = path.join(process.cwd(), 'scratch', `cdp-profile-${port}`);
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
  const comandoCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('SEU COMANDO') && d.classList.contains('rounded-panel'));
  const posicaoCard = document.querySelector('.rounded-section');

  const btns = Array.from(document.querySelectorAll('header button')).filter(b => 
    b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')
  ).map(b => ({
    title: b.getAttribute('title'),
    aria: b.getAttribute('aria-label'),
    visible: b.offsetWidth > 0 && b.offsetHeight > 0,
    icon: b.querySelector('svg')?.classList.contains('lucide-sun') ? 'Sun' : (b.querySelector('svg')?.classList.contains('lucide-moon') ? 'Moon' : 'Other')
  }));

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
    comandoCard: {
      bg: comandoCard ? window.getComputedStyle(comandoCard).backgroundColor : 'none',
      color: comandoCard ? window.getComputedStyle(comandoCard).color : 'none'
    },
    posicaoCard: {
      bg: posicaoCard ? window.getComputedStyle(posicaoCard).backgroundColor : 'none',
      color: posicaoCard ? window.getComputedStyle(posicaoCard).color : 'none'
    },
    themeButtons: btns
  };
})()`;

async function testTarget(baseUrl, label, port) {
  console.log(`\n========================================================`);
  console.log(`TESTANDO: ${label} (${baseUrl})`);
  console.log(`========================================================`);

  const client = await startChrome(port, baseUrl);
  const { send, evaluate, close } = client;

  // Aguarda 2.5s para a página inicial carregar e estabelecer a sessão
  await sleep(2500);

  // Define modo demo e navega para /app/central
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: `${baseUrl}/app/central` });

  // Aguarda Cockpit carregar
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

  // 1. Estado Inicial
  const initMetrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(`[${label}] Estado Inicial:`, JSON.stringify(initMetrics, null, 2));

  const ssInit = await send('Page.captureScreenshot', { format: 'png' });
  if (ssInit?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-initial.png`), Buffer.from(ssInit.result.data, 'base64'));
  }

  // 2. Clique 1
  console.log(`[${label}] Clicando no controle de tema...`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const after1Metrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(`[${label}] Após Clique 1:`, JSON.stringify(after1Metrics, null, 2));

  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss1?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-after-click1.png`), Buffer.from(ss1.result.data, 'base64'));
  }

  // 3. Clique 2
  console.log(`[${label}] Clicando novamente no controle de tema...`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const after2Metrics = await evaluate(EXTRACT_METRICS_EXPR);
  console.log(`[${label}] Após Clique 2:`, JSON.stringify(after2Metrics, null, 2));

  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss2?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-after-click2.png`), Buffer.from(ss2.result.data, 'base64'));
  }

  close();
  return { initMetrics, after1Metrics, after2Metrics };
}

async function testBreakpointsWithEmulation() {
  console.log(`\n========================================================`);
  console.log(`TESTANDO BREAKPOINTS VIA EMULAÇÃO DE DISPOSITIVO`);
  console.log(`========================================================`);

  const client = await startChrome(9235, 'http://localhost:4173/');
  const { send, evaluate, close } = client;

  await sleep(2000);
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:4173/app/central' });
  await sleep(3500);

  const widths = [1000, 1023, 1024, 1150, 1279, 1280, 1440];
  const results = [];

  for (const w of widths) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await sleep(500);

    const bp = await evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('header button'));
      const desktopDiv = document.querySelector('header div.hidden.xl\\\\:flex');
      const mobileDiv = document.querySelector('header div.lg\\\\:hidden');

      const desktopBtn = desktopDiv ? desktopDiv.querySelector('button[title*="tema"], button[aria-label*="tema"]') : null;
      const mobileBtn = mobileDiv ? mobileDiv.querySelector('button[title*="tema"], button[aria-label*="tema"]') : null;
      const menuBtn = mobileDiv ? mobileDiv.querySelector('button[aria-label="Menu"]') : null;

      const isVisible = (el) => el ? (el.offsetWidth > 0 && el.offsetHeight > 0) : false;

      return {
        requestedWidth: ${w},
        innerWidth: window.innerWidth,
        desktopDivComputedDisplay: desktopDiv ? window.getComputedStyle(desktopDiv).display : 'null',
        mobileDivComputedDisplay: mobileDiv ? window.getComputedStyle(mobileDiv).display : 'null',
        desktopBtnVisible: isVisible(desktopBtn),
        mobileBtnVisible: isVisible(mobileBtn),
        mobileMenuBtnVisible: isVisible(menuBtn),
        anyHeaderThemeBtnVisible: isVisible(desktopBtn) || isVisible(mobileBtn),
        visibleButtonsSummary: allBtns.filter(isVisible).map(b => b.getAttribute('title') || b.getAttribute('aria-label') || b.innerText.trim() || b.querySelector('svg')?.getAttribute('class'))
      };
    })()`);

    console.log(`Resultado para ${w}px:`, JSON.stringify(bp, null, 2));
    results.push(bp);
  }

  close();
  return results;
}

async function testCacheAndStylesDetailed() {
  console.log(`\n========================================================`);
  console.log(`VERIFICANDO SERVICE WORKERS, CACHE E ESPECIFICIDADE CSS`);
  console.log(`========================================================`);

  const client = await startChrome(9236, 'http://localhost:4173/');
  const { send, evaluate, close } = client;

  await sleep(2000);
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:4173/app/central' });
  await sleep(3500);

  const analysis = await evaluate(`(async () => {
    // Service Worker
    let sw = [];
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      sw = regs.map(r => ({ scope: r.scope, active: !!r.active }));
    }

    // Stylesheets
    const sheets = Array.from(document.styleSheets).map(s => {
      try {
        return { href: s.href || 'inline', rulesCount: s.cssRules.length };
      } catch (e) {
        return { href: s.href || 'inline', error: e.message };
      }
    });

    // Inspeciona regras que mencionam .dark no seletor
    let darkRulesCount = 0;
    let sampleDarkSelectors = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('.dark')) {
            darkRulesCount++;
            if (sampleDarkSelectors.length < 5) {
              sampleDarkSelectors.push(rule.selectorText);
            }
          }
        }
      } catch {}
    }

    // Checa classes fixas nos ancestrais do Cockpit
    const hero = document.querySelector('.rounded-panel');
    let ancestorClasses = [];
    let curr = hero;
    while (curr && curr !== document.body) {
      ancestorClasses.push({ tag: curr.tagName, className: curr.className });
      curr = curr.parentElement;
    }

    return {
      serviceWorkers: sw,
      styleSheets: sheets,
      totalDarkRules: darkRulesCount,
      sampleDarkSelectors,
      ancestorsOfHero: ancestorClasses
    };
  })()`);

  console.log('Análise detalhada de CSS e Cache:', JSON.stringify(analysis, null, 2));
  close();
  return analysis;
}

async function run() {
  // 1. Preview
  await testTarget('http://localhost:4173', 'preview', 9231);

  // 2. Dev Server
  await testTarget('http://localhost:5173', 'dev', 9232);

  // 3. Breakpoints com Emulação
  await testBreakpointsWithEmulation();

  // 4. Cache & CSS
  await testCacheAndStylesDetailed();

  console.log('\n========================================================');
  console.log('DIAGNÓSTICO COMPLETO FINALIZADO.');
  console.log('========================================================');
  process.exit(0);
}

run().catch(e => {
  console.error('Falha geral no script:', e);
  process.exit(1);
});
