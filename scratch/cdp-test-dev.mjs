import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = path.join(process.cwd(), 'scratch', 'cdp-profile-dev');
if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(chromePath, [
  '--headless=new',
  '--remote-debugging-port=9224',
  '--user-data-dir=' + userDataDir,
  '--no-first-run',
  '--disable-extensions',
  '--disable-gpu',
  '--window-size=1440,900',
  'http://localhost:5173/'
]);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const data = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9224/json/list', (res) => {
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

  await sleep(3000);

  console.log('=== TEST ON DEV SERVER (http://localhost:5173) ===');
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
  await sleep(4000);

  const devInitial = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      url: window.location.href,
      htmlClass: document.documentElement.className,
      themeSaved: localStorage.getItem('fpi_theme'),
      headerBg: h ? window.getComputedStyle(h).backgroundColor : 'none',
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      buttons: Array.from(document.querySelectorAll('header button')).map(b => ({
        title: b.getAttribute('title'),
        aria: b.getAttribute('aria-label'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Dev server initial:', JSON.stringify(devInitial, null, 2));

  // Click theme button
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => b.offsetWidth > 0 && (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')));
    btn?.click();
  })()`);
  await sleep(1500);

  const devAfter1 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      htmlClass: document.documentElement.className,
      themeSaved: localStorage.getItem('fpi_theme'),
      headerBg: h ? window.getComputedStyle(h).backgroundColor : 'none',
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      buttons: Array.from(document.querySelectorAll('header button')).map(b => ({
        title: b.getAttribute('title'),
        aria: b.getAttribute('aria-label'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Dev server after click 1:', JSON.stringify(devAfter1, null, 2));

  const ssDev1 = await send('Page.captureScreenshot', { format: 'png' });
  if (ssDev1?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'dev-central-state1.png'), Buffer.from(ssDev1.result.data, 'base64'));
    console.log('Saved dev-central-state1.png');
  }

  // Click again
  await evaluate(`(() => {
    const btns = Array.from(document.querySelectorAll('header button'));
    const btn = btns.find(b => b.offsetWidth > 0 && (b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')));
    btn?.click();
  })()`);
  await sleep(1500);

  const devAfter2 = await evaluate(`(() => {
    const h = document.querySelector('header');
    const hero = document.querySelector('.rounded-panel');
    const aside = document.querySelector('aside');
    return {
      htmlClass: document.documentElement.className,
      themeSaved: localStorage.getItem('fpi_theme'),
      headerBg: h ? window.getComputedStyle(h).backgroundColor : 'none',
      heroBg: hero ? window.getComputedStyle(hero).backgroundColor : 'none',
      heroColor: hero ? window.getComputedStyle(hero).color : 'none',
      bodyBg: window.getComputedStyle(document.body).backgroundColor,
      asideBg: aside ? window.getComputedStyle(aside).backgroundColor : 'none',
      buttons: Array.from(document.querySelectorAll('header button')).map(b => ({
        title: b.getAttribute('title'),
        aria: b.getAttribute('aria-label'),
        visible: b.offsetWidth > 0 && b.offsetHeight > 0,
        icon: b.querySelector('svg')?.getAttribute('class')
      }))
    };
  })()`);
  console.log('Dev server after click 2:', JSON.stringify(devAfter2, null, 2));

  const ssDev2 = await send('Page.captureScreenshot', { format: 'png' });
  if (ssDev2?.result?.data) {
    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'dev-central-state2.png'), Buffer.from(ssDev2.result.data, 'base64'));
    console.log('Saved dev-central-state2.png');
  }

  chrome.kill();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  chrome.kill();
  process.exit(1);
});
