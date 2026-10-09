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
  const port = 9690;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-mais')}`,
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

    const out = {};

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

      await send('Page.navigate', { url: 'http://localhost:5173/app/mais' });
      for (let i = 0; i < 30; i++) {
        const ready = await evaluate(`Boolean(document.querySelector('h2'))`);
        if (ready) break;
        await sleep(300);
      }
      await sleep(1500);

      const data = await evaluate(`(() => {
        const h2 = document.querySelector('h2');
        const h2cs = h2 ? window.getComputedStyle(h2) : null;

        const shadowCards = Array.from(document.querySelectorAll('.shadow-card'));
        const profCard = shadowCards[0];
        const subCard = shadowCards[1];
        const refCard = shadowCards[2];

        const profCs = profCard ? window.getComputedStyle(profCard) : null;
        const subCs = subCard ? window.getComputedStyle(subCard) : null;
        const refCs = refCard ? window.getComputedStyle(refCard) : null;

        const h4 = refCard ? refCard.querySelector('h4') : null;
        const h4cs = h4 ? window.getComputedStyle(h4) : null;
        const refP = refCard ? refCard.querySelector('p') : null;
        const refPcs = refP ? window.getComputedStyle(refP) : null;
        const refBtn = refCard ? refCard.querySelector('button') : null;
        const refBtnCs = refBtn ? window.getComputedStyle(refBtn) : null;

        // Subcard inside profile
        const profInner = profCard ? profCard.querySelector('.rounded-2xl') : null;
        const profInnerCs = profInner ? window.getComputedStyle(profInner) : null;

        return {
          titleMaisOpcoes: {
            text: h2 ? h2.textContent.trim() : null,
            color: h2cs ? h2cs.color : null
          },
          profileCard: {
            bg: profCs ? profCs.backgroundColor : null,
            border: profCs ? profCs.borderColor : null,
            innerBg: profInnerCs ? profInnerCs.backgroundColor : null,
            innerBorder: profInnerCs ? profInnerCs.borderColor : null
          },
          subscriptionCard: {
            bg: subCs ? subCs.backgroundColor : null,
            border: subCs ? subCs.borderColor : null
          },
          referralCard: {
            bg: refCs ? refCs.backgroundColor : null,
            border: refCs ? refCs.borderColor : null,
            titleColor: h4cs ? h4cs.color : null,
            textColor: refPcs ? refPcs.color : null,
            btnBg: refBtnCs ? refBtnCs.backgroundColor : null,
            btnColor: refBtnCs ? refBtnCs.color : null
          }
        };
      })()`);

      out[theme] = data;
    }

    console.log('MAIS_INSPECTION_RESULTS:\n' + JSON.stringify(out, null, 2));

    ws.close();
    proc.kill();
  } catch (err) {
    console.error('Error:', err);
    try { proc.kill(); } catch {}
  }
}

run();
