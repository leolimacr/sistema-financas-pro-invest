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
  const port = 9250;
  const profileDir = path.join(process.cwd(), 'scratch', `cdp-profile-css-inspect`);
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
  await send('CSS.enable');

  await sleep(2500);
  await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
  await send('Page.navigate', { url: 'http://localhost:5173/app/central' });

  // Aguarda carregar Cockpit
  for (let i = 0; i < 40; i++) {
    const ok = await evaluate(`!!document.querySelector('.rounded-panel')`);
    if (ok) break;
    await sleep(500);
  }

  // Clica no controle de tema para ir para Light
  await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('header button')).find(b => b.offsetWidth > 0 && b.getAttribute('title')?.includes('tema'));
    btn?.click();
  })()`);
  await sleep(1500);

  // Agora inspeciona detalhadamente o elemento .rounded-panel e header
  const inspectResult = await evaluate(`(() => {
    const hero = document.querySelector('.rounded-panel');
    const header = document.querySelector('header');
    const html = document.documentElement;

    // Obtém todas as regras CSS correspondentes a .rounded-panel
    function getMatchingRules(el) {
      const rules = [];
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.selectorText && el.matches(rule.selectorText)) {
              rules.push({
                selector: rule.selectorText,
                cssText: rule.cssText
              });
            }
          }
        } catch (e) {}
      }
      return rules;
    }

    return {
      htmlClass: html.className,
      htmlDataset: Object.assign({}, html.dataset),
      heroClasses: hero ? hero.className : null,
      heroComputedBg: hero ? window.getComputedStyle(hero).backgroundColor : null,
      heroMatchingRules: hero ? getMatchingRules(hero) : [],
      headerMatchingRules: header ? getMatchingRules(header) : [],
      documentStyleSheets: Array.from(document.styleSheets).map(s => ({
        href: s.href || 'inline',
        ownerNodeTag: s.ownerNode?.tagName,
        ownerNodeId: s.ownerNode?.id,
        rulesCount: (() => { try { return s.cssRules.length; } catch { return 'access-denied'; } })()
      }))
    };
  })()`);

  console.log('Resultado da inspeção CSS no Dev Server:', JSON.stringify(inspectResult, null, 2));

  try { ws.close(); } catch {}
  try { proc.kill(); } catch {}
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
