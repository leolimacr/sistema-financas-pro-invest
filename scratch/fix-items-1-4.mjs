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
  const port = 9668;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-test-light')}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1440,900',
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

    await sleep(2000);
    // Explicitly set light mode
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(2500);

    const title = await evaluate('document.title');
    const h1 = await evaluate('document.querySelector("h1")?.textContent');
    console.log('Title:', title, '| H1:', h1);

    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png', Buffer.from(ss1.result.data, 'base64'));
    console.log('Item 1 light saved:', fs.statSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png').size, 'bytes');

    // Register
    await send('Page.navigate', { url: 'http://localhost:5173/register' });
    await sleep(3000);
    const regH1 = await evaluate('document.querySelector("h1, h2")?.textContent');
    console.log('Register heading:', regH1);
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/item-4-autentica__o__cadastro_-light.png', Buffer.from(ss4.result.data, 'base64'));
    console.log('Item 4 light saved:', fs.statSync('scratch/homologation-screenshots/item-4-autentica__o__cadastro_-light.png').size, 'bytes');
  } finally {
    proc.kill();
  }
}
run().catch(console.error);
