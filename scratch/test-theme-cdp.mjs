import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.cwd(), 'scratch', 'cdp-profile-clean');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--user-data-dir=' + userDataDir,
  '--no-first-run',
  '--disable-extensions',
  '--disable-gpu',
  '--window-size=1440,900',
  'http://localhost:4173/'
]);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json/list', (res) => {
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
  throw new Error('Could not get WebSocketDebuggerUrl');
}

async function run() {
  const wsUrl = await getWsUrl();
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

  console.log('=== TESTE 1: TELA PÚBLICA (/) ===');
  await send('Page.navigate', { url: 'http://localhost:4173/' });
  await sleep(3000);

  const pubInit = await evaluate(`({
    url: window.location.href,
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    headerBg: window.getComputedStyle(document.querySelector('header') || document.body).backgroundColor,
    themeButtonTitle: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.getAttribute('title') || 'not found',
    themeButtonAria: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.getAttribute('aria-label') || 'not found'
  })`);
  console.log('Estado Inicial na Home Pública:', pubInit);

  // Clica no botão de tema do AppHeader
  await evaluate(`document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.click()`);
  await sleep(1000);

  const pubAfter1 = await evaluate(`({
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    headerBg: window.getComputedStyle(document.querySelector('header') || document.body).backgroundColor,
    themeButtonTitle: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.getAttribute('title') || 'not found'
  })`);
  console.log('Após 1º Clique (Pública):', pubAfter1);

  // Clica novamente
  await evaluate(`document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.click()`);
  await sleep(1000);

  const pubAfter2 = await evaluate(`({
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    themeButtonTitle: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"]')?.getAttribute('title') || 'not found'
  })`);
  console.log('Após 2º Clique (Pública):', pubAfter2);

  console.log('\n=== TESTE 2: TELA AUTENTICADA (CENTRAL / COCKPIT) ===');
  // Ativa o demo mode no sessionStorage e vai para /app/central
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:4173/app/central' });
  await sleep(4000);

  const centralInit = await evaluate(`({
    url: window.location.href,
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    headerBg: window.getComputedStyle(document.querySelector('header') || document.body).backgroundColor,
    sidebarBg: window.getComputedStyle(document.querySelector('aside') || document.body).backgroundColor,
    heroCardBg: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).backgroundColor,
    heroCardColor: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).color,
    buttonsInHeader: Array.from(document.querySelectorAll('header button')).map(b => ({
      title: b.getAttribute('title'),
      aria: b.getAttribute('aria-label'),
      text: b.innerText,
      svgClass: b.querySelector('svg')?.getAttribute('class')
    }))
  })`);
  console.log('Estado Inicial na Central:', JSON.stringify(centralInit, null, 2));

  // Clica no botão de tema na Central
  const centralClicked = await evaluate(`(() => {
    const btn = document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"]');
    if (!btn) return 'BUTTON NOT FOUND';
    btn.click();
    return 'CLICKED: ' + (btn.getAttribute('title') || btn.getAttribute('aria-label'));
  })()`);
  console.log('Ação de clique na Central:', centralClicked);
  await sleep(1500);

  const centralAfter1 = await evaluate(`({
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    headerBg: window.getComputedStyle(document.querySelector('header') || document.body).backgroundColor,
    sidebarBg: window.getComputedStyle(document.querySelector('aside') || document.body).backgroundColor,
    heroCardBg: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).backgroundColor,
    heroCardColor: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).color,
    themeButtonNow: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"]')?.getAttribute('title'),
    svgInButton: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"] svg')?.getAttribute('class')
  })`);
  console.log('Após 1º Clique na Central:', JSON.stringify(centralAfter1, null, 2));

  // Clica no botão de tema novamente na Central
  await evaluate(`document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"]')?.click()`);
  await sleep(1500);

  const centralAfter2 = await evaluate(`({
    htmlClasses: document.documentElement.className,
    themeSaved: localStorage.getItem('fpi_theme'),
    colorScheme: document.documentElement.style.colorScheme,
    bodyBg: window.getComputedStyle(document.body).backgroundColor,
    headerBg: window.getComputedStyle(document.querySelector('header') || document.body).backgroundColor,
    sidebarBg: window.getComputedStyle(document.querySelector('aside') || document.body).backgroundColor,
    heroCardBg: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).backgroundColor,
    heroCardColor: window.getComputedStyle(document.querySelector('.rounded-panel') || document.body).color,
    themeButtonNow: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"]')?.getAttribute('title'),
    svgInButton: document.querySelector('header button[title*=\"tema\"], header button[aria-label*=\"tema\"], header button[title*=\"Mudar\"] svg')?.getAttribute('class')
  })`);
  console.log('Após 2º Clique na Central:', JSON.stringify(centralAfter2, null, 2));

  // Tira screenshot do estado atual
  const screenshotData = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'scratch', 'cockpit-screenshot.png'), Buffer.from(screenshotData.data, 'base64'));
  console.log('Screenshot salvo em scratch/cockpit-screenshot.png');

  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
