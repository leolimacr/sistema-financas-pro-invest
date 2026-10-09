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
  throw new Error(`Could not connect to Chrome on port ${port}`);
}

async function run() {
  const port = 9265;
  const profileDir = path.join(process.cwd(), 'scratch', `cdp-profile-css-search`);
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const proc = spawn(chromePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-extensions',
    '--disable-gpu',
    '--window-size=1440,900',
    'http://localhost:5173/'
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

  await sleep(2500);
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:5173/app/central' });

  for (let i = 0; i < 40; i++) {
    const ok = await evaluate(`!!document.querySelector('.rounded-panel')`);
    if (ok) break;
    await sleep(500);
  }

  const cssInfo = await evaluate(`(() => {
    const hero = document.querySelector('.rounded-panel');
    const cs = window.getComputedStyle(hero);

    // Encontra TODAS as regras que definem background-color ou background no hero
    const allBgRules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.style && (rule.style.backgroundColor || rule.style.background)) {
            if (hero.matches(rule.selectorText)) {
              allBgRules.push({
                selector: rule.selectorText,
                bg: rule.style.backgroundColor || rule.style.background
              });
            }
          }
        }
      } catch (e) {}
    }

    // Procura por regras com '.dark' no selectorText de todas as folhas
    const darkRules = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && rule.selectorText.includes('dark')) {
            darkRules.push({
              selector: rule.selectorText,
              css: rule.cssText.slice(0, 100)
            });
          }
        }
      } catch (e) {}
    }

    return {
      heroComputedBg: cs.backgroundColor,
      allBgRulesMatchingHero: allBgRules,
      totalDarkRulesFound: darkRules.length,
      sampleDarkRules: darkRules.slice(0, 10)
    };
  })()`);

  console.log('Pesquisa de regras CSS no Dev Server:', JSON.stringify(cssInfo, null, 2));

  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
