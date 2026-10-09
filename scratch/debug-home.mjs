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
  const port = 9669;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-debug-home')}`,
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
    const consoleLogs = [];
    ws.onmessage = e => {
      const msg = JSON.parse(e.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push(msg.params.args.map(a => a.value || a.description).join(' '));
      }
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

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(4000);

    const bodyHtml = await evaluate('document.body.innerHTML');
    const url = await evaluate('window.location.href');
    console.log('Current URL:', url);
    console.log('Body HTML length:', bodyHtml ? bodyHtml.length : 0);
    console.log('Body start:', bodyHtml ? bodyHtml.substring(0, 300) : 'null');
    console.log('Console logs:', consoleLogs.slice(-10));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png', Buffer.from(ss.result.data, 'base64'));
    console.log('Screenshot size:', fs.statSync('scratch/homologation-screenshots/item-1-public_home__web_-light.png').size);
  } finally {
    proc.kill();
  }
}
run().catch(console.error);
