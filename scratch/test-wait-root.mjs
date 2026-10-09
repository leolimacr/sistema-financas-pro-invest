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
  const port = 9670;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-debug-home')}`,
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
    await send('Runtime.enable');

    // Wait until #root has children
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const rootChildren = await evaluate('document.getElementById("root")?.children.length || 0');
      const hasH1 = await evaluate('Boolean(document.querySelector("h1, header, nav"))');
      console.log(`Poll ${i}: rootChildren=${rootChildren}, hasHeaderOrH1=${hasH1}`);
      if (rootChildren > 0 && hasH1) {
        ready = true;
        break;
      }
    }

    if (!ready) {
      console.log('Timeout waiting for root!');
      return;
    }

    // Set light mode
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(600);

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png', Buffer.from(ss.result.data, 'base64'));
    console.log('Saved Item 1 Light screenshot:', fs.statSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png').size, 'bytes');
  } finally {
    proc.kill();
  }
}
run().catch(console.error);
