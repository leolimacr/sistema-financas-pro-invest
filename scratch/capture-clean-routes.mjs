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
  const port = 9671;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-clean-routes')}`,
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

    async function applyTheme(th) {
      await evaluate(`(() => {
        localStorage.setItem('fpi_theme', '${th}');
        if ('${th}' === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      })()`);
      await sleep(400);
    }

    async function capturePage(itemNum, routePath, namePrefix, isAuth = false) {
      console.log(`\nNavegando para ${routePath}...`);
      await send('Page.navigate', { url: `http://localhost:5173${routePath}` });
      
      // Espera Suspense / Skeleton sumir e h1/h2 ou container real aparecer
      let ready = false;
      for (let i = 0; i < 20; i++) {
        await sleep(600);
        const hasSkeleton = await evaluate(`Boolean(document.querySelector('.animate-pulse, [role="status"], .app-loading-screen'))`);
        const hasContent = await evaluate(`Boolean(document.querySelector('h1, h2, main, section, .prose'))`);
        if (!hasSkeleton && hasContent) {
          ready = true;
          break;
        }
      }
      console.log(`Pronto para captura? ${ready}`);

      for (const th of ['light', 'dark']) {
        await applyTheme(th);
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        const fname = `item-${itemNum}-${namePrefix}-${th}.png`;
        const fpath = path.join('scratch', 'homologation-screenshots', fname);
        fs.writeFileSync(fpath, Buffer.from(ss.result.data, 'base64'));
        console.log(`Salvo: ${fname} (${fs.statSync(fpath).size} bytes)`);
      }
    }

    // Rotas públicas (sem sessão)
    await capturePage(5, '/termos', 'termos_de_uso');
    await capturePage(6, '/privacidade', 'pol_tica_de_privacidade');

    // Rotas autenticadas (com modo demo)
    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
    await capturePage(20, '/app/agenda', 'agenda_financeira', true);
    await capturePage(21, '/app/explorar', 'discovery_hub', true);
    await capturePage(23, '/app/mais', 'configura__es__mais_', true);
    await capturePage(25, '/app/carteira', 'carteira_soberana', true);

  } finally {
    proc.kill();
  }
}
run().catch(console.error);
