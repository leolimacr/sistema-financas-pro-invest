import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.cwd(), 'scratch', 'cdp-profile-inspect');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9223',
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
        http.get('http://127.0.0.1:9223/json/list', (res) => {
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

  await sleep(2500);

  console.log('=== INSPECTION: PUBLIC HOME (/) ===');
  const initial = await evaluate(`(() => {
    const h = document.querySelector('header');
    const cs = window.getComputedStyle(h);
    return {
      htmlClass: document.documentElement.className,
      headerClass: h.className,
      headerBg: cs.backgroundColor,
      headerBackdropFilter: cs.backdropFilter,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      buttonTitle: h.querySelector('button[title*="tema"], button[title*="Mudar"]')?.getAttribute('title'),
      buttonIcon: h.querySelector('button[title*="tema"], button[title*="Mudar"] svg')?.getAttribute('class')
    };
  })()`);
  console.log('Initial state:', initial);

  // Click theme button
  await evaluate(`document.querySelector('header button[title*="tema"], header button[title*="Mudar"]')?.click()`);
  await sleep(1000);

  const afterClick1 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const cs = window.getComputedStyle(h);
    return {
      htmlClass: document.documentElement.className,
      headerClass: h.className,
      headerBg: cs.backgroundColor,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      buttonTitle: h.querySelector('button[title*="tema"], button[title*="Mudar"]')?.getAttribute('title'),
      buttonIcon: h.querySelector('button[title*="tema"], button[title*="Mudar"] svg')?.getAttribute('class')
    };
  })()`);
  console.log('After Click 1:', afterClick1);

  // Take screenshot
  const ss1 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss1?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'public-light.png'), Buffer.from(ss1.result.data, 'base64'));
    console.log('Saved public-light.png');
  }

  // Click again
  await evaluate(`document.querySelector('header button[title*="tema"], header button[title*="Mudar"]')?.click()`);
  await sleep(1000);

  const afterClick2 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const cs = window.getComputedStyle(h);
    return {
      htmlClass: document.documentElement.className,
      headerClass: h.className,
      headerBg: cs.backgroundColor,
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      buttonTitle: h.querySelector('button[title*="tema"], button[title*="Mudar"]')?.getAttribute('title'),
      buttonIcon: h.querySelector('button[title*="tema"], button[title*="Mudar"] svg')?.getAttribute('class')
    };
  })()`);
  console.log('After Click 2:', afterClick2);

  const ss2 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss2?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'public-dark.png'), Buffer.from(ss2.result.data, 'base64'));
    console.log('Saved public-dark.png');
  }

  // Now go to /app/central
  console.log('\n=== INSPECTION: CENTRAL / COCKPIT (/app/central) ===');
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:4173/app/central' });
  await sleep(3500);

  const centralInit = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      htmlClass: document.documentElement.className,
      headerBg: window.getComputedStyle(h).backgroundColor,
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      themeButtons: Array.from(document.querySelectorAll('header button[title*="tema"], header button[title*="Mudar"]')).map(b => ({
        title: b.getAttribute('title'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Central initial:', centralInit);

  // Click visible theme button
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button[title*="tema"], header button[title*="Mudar"]'));
    const visibleBtn = btns.find(b => b.offsetWidth > 0 && b.offsetHeight > 0) || btns[0];
    visibleBtn?.click();
  })()`);
  await sleep(1500);

  const centralAfter1 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      htmlClass: document.documentElement.className,
      headerBg: window.getComputedStyle(h).backgroundColor,
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      themeButtons: Array.from(document.querySelectorAll('header button[title*="tema"], header button[title*="Mudar"]')).map(b => ({
        title: b.getAttribute('title'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Central after click 1:', centralAfter1);

  const ss3 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss3?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'central-state1.png'), Buffer.from(ss3.result.data, 'base64'));
    console.log('Saved central-state1.png');
  }

  // Click again
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button[title*="tema"], header button[title*="Mudar"]'));
    const visibleBtn = btns.find(b => b.offsetWidth > 0 && b.offsetHeight > 0) || btns[0];
    visibleBtn?.click();
  })()`);
  await sleep(1500);

  const centralAfter2 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      htmlClass: document.documentElement.className,
      headerBg: window.getComputedStyle(h).backgroundColor,
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      themeButtons: Array.from(document.querySelectorAll('header button[title*="tema"], header button[title*="Mudar"]')).map(b => ({
        title: b.getAttribute('title'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Central after click 2:', centralAfter2);

  const ss4 = await send('Page.captureScreenshot', { format: 'png' });
  if (ss4?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'central-state2.png'), Buffer.from(ss4.result.data, 'base64'));
    console.log('Saved central-state2.png');
  }

  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
