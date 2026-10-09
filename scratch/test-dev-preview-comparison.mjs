import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function sleep(ms) {
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
  throw new Error(`Could not get WebSocketDebuggerUrl on port ${port}`);
}

async function createCdpClient(port, initialUrl, width = 1440, height = 900) {
  const userDataDir = path.join(process.cwd(), 'scratch', `cdp-profile-${port}-${width}`);
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const chrome = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--disable-extensions',
    '--disable-gpu',
    `--window-size=${width},${height}`,
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

  return {
    chrome,
    send,
    evaluate,
    close: () => {
      try { ws.close(); } catch {}
      try { chrome.kill(); } catch {}
    }
  };
}

async function inspectEnvironment(url, label, port, width = 1440) {
  console.log(`\n======================================================`);
  console.log(`INSPEÇÃO: ${label} (${url}) em largura ${width}px`);
  console.log(`======================================================`);

  const client = await createCdpClient(port, url, width, 900);
  const { send, evaluate, close } = client;

  // Garante demo mode
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: `${url}/app/central` });

  // Aguarda até o Cockpit carregar
  console.log('Aguardando montagem do Cockpit...');
  let mounted = false;
  for (let i = 0; i < 30; i++) {
    const isReady = await evaluate(`(() => {
      const hero = document.querySelector('.rounded-panel');
      const header = document.querySelector('header');
      return !!(hero && header);
    })()`);
    if (isReady) {
      mounted = true;
      break;
    }
    await sleep(500);
  }

  if (!mounted) {
    console.error(`Falha: Cockpit não montou em ${label} após 15 segundos!`);
    const pageHtml = await evaluate(`document.body.innerHTML.slice(0, 500)`);
    console.log('HTML parcial da página:', pageHtml);
    close();
    return null;
  }
  console.log('Cockpit montado com sucesso.');

  const extractMetrics = `(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    const root = document.getElementById('root');
    const body = document.body;
    
    // Procura cards internos da Central
    const comandoCard = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.includes('SEU COMANDO') && d.classList.contains('rounded-panel'));
    const posicaoCard = document.querySelector('.rounded-section');

    const getBtnInfo = (b) => ({
      title: b?.getAttribute('title'),
      aria: b?.getAttribute('aria-label'),
      visible: b ? (b.offsetWidth > 0 && b.offsetHeight > 0) : false,
      iconClass: b?.querySelector('svg')?.getAttribute('class'),
      iconName: b?.querySelector('svg')?.classList.contains('lucide-sun') ? 'Sun' : (b?.querySelector('svg')?.classList.contains('lucide-moon') ? 'Moon' : 'Other')
    });

    const headerThemeBtns = Array.from(document.querySelectorAll('header button')).filter(b => 
      b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')
    ).map(getBtnInfo);

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
      themeButtons: headerThemeBtns
    };
  })()`;

  // 1. Estado Inicial
  const stateInitial = await evaluate(extractMetrics);
  console.log(`[${label}] Estado Inicial:`, JSON.stringify(stateInitial, null, 2));

  const ssInit = await send('Page.captureScreenshot', { format: 'png' });
  if (ssInit?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-initial.png`), Buffer.from(ssInit.result.data, 'base64'));
  }

  // 2. Primeiro Clique
  console.log(`[${label}] Executando 1º clique no controle de tema...`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const stateAfter1 = await evaluate(extractMetrics);
  console.log(`[${label}] Após 1º Clique:`, JSON.stringify(stateAfter1, null, 2));

  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss1?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-after-click1.png`), Buffer.from(ss1.result.data, 'base64'));
  }

  // 3. Segundo Clique
  console.log(`[${label}] Executando 2º clique no controle de tema...`);
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0) || btns.find(b => b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  const stateAfter2 = await evaluate(extractMetrics);
  console.log(`[${label}] Após 2º Clique:`, JSON.stringify(stateAfter2, null, 2));

  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss2?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', `${label}-after-click2.png`), Buffer.from(ss2.result.data, 'base64'));
  }

  close();
  return { stateInitial, stateAfter1, stateAfter2 };
}

async function testBreakpointInterval() {
  console.log('\n======================================================');
  console.log('TESTE 3: BREAKPOINTS DO HEADER (1000px, 1023px, 1024px, 1150px, 1279px, 1280px, 1440px)');
  console.log('======================================================');

  const widths = [1000, 1023, 1024, 1150, 1279, 1280, 1440];
  const results = [];

  for (const w of widths) {
    const port = 9230 + (w % 10);
    const client = await createCdpClient(port, 'http://localhost:4173/', w, 900);
    const { send, evaluate, close } = client;

    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
    await send('Page.navigate', { url: 'http://localhost:4173/app/central' });
    await sleep(2500);

    const bpInfo = await evaluate(`(() => {
      const allBtns = Array.from(document.querySelectorAll('header button'));
      const desktopThemeBtn = document.querySelector('header div.hidden.xl\\\\:flex button[title*="tema"], header div.hidden.xl\\\\:flex button[aria-label*="tema"]');
      const mobileThemeBtn = document.querySelector('header div.lg\\\\:hidden button[title*="tema"], header div.lg\\\\:hidden button[aria-label*="tema"]');
      const menuBtn = document.querySelector('header button[aria-label="Menu"]');

      return {
        width: window.innerWidth,
        desktopBtnFound: !!desktopThemeBtn,
        desktopBtnVisible: desktopThemeBtn ? (desktopThemeBtn.offsetWidth > 0 && desktopThemeBtn.offsetHeight > 0) : false,
        mobileBtnFound: !!mobileThemeBtn,
        mobileBtnVisible: mobileThemeBtn ? (mobileThemeBtn.offsetWidth > 0 && mobileThemeBtn.offsetHeight > 0) : false,
        menuBtnVisible: menuBtn ? (menuBtn.offsetWidth > 0 && menuBtn.offsetHeight > 0) : false,
        anyThemeBtnVisible: allBtns.some(b => (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')) && b.offsetWidth > 0),
        allVisibleHeaderBtns: allBtns.filter(b => b.offsetWidth > 0).map(b => b.getAttribute('title') || b.getAttribute('aria-label') || b.innerText || b.querySelector('svg')?.getAttribute('class'))
      };
    })()`);

    console.log(`Largura ${w}px:`, bpInfo);
    results.push(bpInfo);
    close();
  }

  return results;
}

async function checkCacheAndStyles() {
  console.log('\n======================================================');
  console.log('TESTE 2: VERIFICAÇÃO DE CACHE, SERVICE WORKERS & FOLHAS CSS');
  console.log('======================================================');

  const client = await createCdpClient(9240, 'http://localhost:4173/', 1440, 900);
  const { evaluate, close } = client;

  const info = await evaluate(`(async () => {
    let swRegistrations = [];
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        swRegistrations = regs.map(r => ({ scope: r.scope, active: !!r.active }));
      }
    } catch (e) { swRegistrations = e.message; }

    const styleSheets = Array.from(document.styleSheets).map(s => {
      try {
        return { href: s.href, rulesCount: s.cssRules.length };
      } catch (e) {
        return { href: s.href, error: 'CORS or unavailable' };
      }
    });

    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline');

    return {
      swRegistrations,
      styleSheets,
      links,
      scripts
    };
  })()`);

  console.log('Cache, Service Workers & CSS info:', JSON.stringify(info, null, 2));
  close();
  return info;
}

async function main() {
  // Teste 1A: Preview (Produção)
  await inspectEnvironment('http://localhost:4173', 'preview', 9225, 1440);

  // Teste 1B: Dev Server
  await inspectEnvironment('http://localhost:5173', 'dev', 9226, 1440);

  // Teste 3: Breakpoints
  await testBreakpointInterval();

  // Teste 2: Cache & CSS
  await checkCacheAndStyles();

  console.log('\nTodos os testes de diagnóstico foram concluídos com sucesso!');
  process.exit(0);
}

main().catch(e => {
  console.error('Erro na execução dos testes:', e);
  process.exit(1);
});
