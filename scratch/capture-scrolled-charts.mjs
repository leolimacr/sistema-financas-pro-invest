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
  const port = 9698;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-charts-scroll')}`,
    '--no-first-run',
    '--disable-extensions',
    '--window-size=1440,1200',
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
    await sleep(2000);

    const outDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');

    for (const theme of ['dark', 'light']) {
      await evaluate(`(() => {
        sessionStorage.setItem('fpi_demo_mode', 'true');
        localStorage.setItem('fpi_theme', '${theme}');
        if ('${theme}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      })()`);

      await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
      await sleep(2500);

      // Scroll specifically to the charts
      await evaluate(`(() => {
        const h3s = Array.from(document.querySelectorAll('h3'));
        const chartH3 = h3s.find(h => h.textContent.includes('Onde seu dinheiro') || h.textContent.includes('Onde o dinheiro') || h.textContent.includes('Composição'));
        if (chartH3) {
          chartH3.scrollIntoView({ behavior: 'instant', block: 'center' });
        } else {
          window.scrollTo(0, 1400);
        }
      })()`);
      await sleep(800);

      const ss = await send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(outDir, `scrolled-controla-charts-${theme}.png`), Buffer.from(ss.result.data, 'base64'));
    }

    console.log('SCROLLED_CHARTS_CAPTURED_SUCCESSFULLY');
    ws.close();
    proc.kill();
  } catch (err) {
    console.error('Error:', err);
    try { proc.kill(); } catch {}
  }
}

run();
