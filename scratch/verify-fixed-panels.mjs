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
  const port = 9685;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-verify-2')}`,
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
    async function captureScreenshot(filepath, clip = null) {
      const params = { format: 'png' };
      if (clip) params.clip = clip;
      const res = await send('Page.captureScreenshot', params);
      if (res.result?.data) {
        fs.writeFileSync(filepath, Buffer.from(res.result.data, 'base64'));
      }
    }

    await send('Page.enable');
    await send('Runtime.enable');
    await sleep(2000);

    const outDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const results = {};

    for (const theme of ['dark', 'light']) {
      results[theme] = {};

      // 1. Setup Theme & Demo Mode
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

      // -----------------------------------------------------------------
      // TEST 1: /app/central -> Proteção Financeira
      // -----------------------------------------------------------------
      await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
      for (let i = 0; i < 30; i++) {
        const ready = await evaluate(`Boolean(document.querySelector('#base-protecao, section[aria-label="Base de Proteção e Métricas"]'))`);
        if (ready) break;
        await sleep(300);
      }
      await sleep(1000);

      // Scroll to #base-protecao
      await evaluate(`(() => {
        const sec = document.querySelector('#base-protecao, section[aria-label="Base de Proteção e Métricas"]');
        if (sec) sec.scrollIntoView({ behavior: 'instant', block: 'center' });
      })()`);
      await sleep(500);

      const protData = await evaluate(`(() => {
        const sec = document.querySelector('#base-protecao, section[aria-label="Base de Proteção e Métricas"]');
        if (!sec) return { error: 'not found' };
        const card = sec.querySelector('.rounded-section') || sec.firstElementChild;
        const cs = window.getComputedStyle(card);
        const h3 = card.querySelector('h3');
        const h3cs = h3 ? window.getComputedStyle(h3) : null;
        const track = card.querySelector('.rounded-full.overflow-hidden');
        const trackCs = track ? window.getComputedStyle(track) : null;
        const rect = card.getBoundingClientRect();
        return {
          computedBg: cs.backgroundColor,
          computedBorder: cs.borderColor,
          h3Color: h3cs ? h3cs.color : null,
          trackBg: trackCs ? trackCs.backgroundColor : null,
          rect: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height }
        };
      })()`);

      await captureScreenshot(path.join(outDir, `after-central-protection-${theme}.png`), protData.rect ? {
        x: Math.max(0, protData.rect.x - 10),
        y: Math.max(0, protData.rect.y - 10),
        width: Math.min(1440, protData.rect.width + 20),
        height: protData.rect.height + 20,
        scale: 1
      } : null);
      await captureScreenshot(path.join(outDir, `after-full-central-${theme}.png`));
      results[theme].protectionBar = protData;

      // -----------------------------------------------------------------
      // TEST 2: /app/controla -> DashboardCharts
      // -----------------------------------------------------------------
      await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
      for (let i = 0; i < 30; i++) {
        const ready = await evaluate(`Boolean(document.querySelector('h3'))`);
        if (ready) break;
        await sleep(300);
      }
      await sleep(1500);

      // Scroll down to where charts are
      await evaluate(`window.scrollTo(0, 1100)`);
      await sleep(800);

      const chartsData = await evaluate(`(() => {
        const h3s = Array.from(document.querySelectorAll('h3'));
        const compH3 = h3s.find(h => h.textContent.includes('dinheiro') || h.textContent.includes('Composição'));
        const flowH3 = h3s.find(h => h.textContent.includes('Pressão') || h.textContent.includes('Fluxo'));

        let compCard = compH3 ? compH3.closest('.rounded-section') : null;
        let flowCard = flowH3 ? flowH3.closest('.rounded-section') : null;

        let compCs = compCard ? window.getComputedStyle(compCard) : null;
        let compH3Cs = compH3 ? window.getComputedStyle(compH3) : null;
        let flowCs = flowCard ? window.getComputedStyle(flowCard) : null;
        let flowH3Cs = flowH3 ? window.getComputedStyle(flowH3) : null;

        let rect = compCard && compCard.parentElement ? compCard.parentElement.getBoundingClientRect() : null;

        return {
          compBg: compCs ? compCs.backgroundColor : null,
          compBorder: compCs ? compCs.borderColor : null,
          compH3Color: compH3Cs ? compH3Cs.color : null,
          flowBg: flowCs ? flowCs.backgroundColor : null,
          flowBorder: flowCs ? flowCs.borderColor : null,
          flowH3Color: flowH3Cs ? flowH3Cs.color : null,
          rect: rect ? { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height } : null
        };
      })()`);

      if (chartsData.rect) {
        await captureScreenshot(path.join(outDir, `after-controla-charts-${theme}.png`), {
          x: Math.max(0, chartsData.rect.x - 10),
          y: Math.max(0, chartsData.rect.y - 10),
          width: Math.min(1440, chartsData.rect.width + 20),
          height: chartsData.rect.height + 20,
          scale: 1
        });
      }
      await captureScreenshot(path.join(outDir, `after-full-controla-${theme}.png`));
      results[theme].controlaCharts = chartsData;

      // -----------------------------------------------------------------
      // TEST 3: /app/mais -> SettingsPage
      // -----------------------------------------------------------------
      await send('Page.navigate', { url: 'http://localhost:5173/app/mais' });
      for (let i = 0; i < 30; i++) {
        const ready = await evaluate(`Boolean(document.querySelector('h2'))`);
        if (ready) break;
        await sleep(300);
      }
      await sleep(1500);

      const maisData = await evaluate(`(() => {
        const h2 = document.querySelector('h2');
        const h2cs = h2 ? window.getComputedStyle(h2) : null;

        const h3s = Array.from(document.querySelectorAll('h3'));
        const subH3 = h3s.find(h => h.textContent.includes('Assinatura'));
        const subCard = subH3 ? subH3.closest('.shadow-card') : null;
        const subCs = subCard ? window.getComputedStyle(subCard) : null;

        const pProfile = Array.from(document.querySelectorAll('p')).find(p => p.textContent.includes('Seu Perfil'));
        const profCard = pProfile ? pProfile.closest('.shadow-card') : null;
        const profCs = profCard ? window.getComputedStyle(profCard) : null;

        const h4Ref = Array.from(document.querySelectorAll('h4')).find(h => h.textContent.includes('Indicar'));
        const refCard = h4Ref ? h4Ref.closest('.rounded-\\[2rem\\]') : null;
        const refCs = refCard ? window.getComputedStyle(refCard) : null;
        const refH4cs = h4Ref ? window.getComputedStyle(h4Ref) : null;

        return {
          h2Color: h2cs ? h2cs.color : null,
          profBg: profCs ? profCs.backgroundColor : null,
          profBorder: profCs ? profCs.borderColor : null,
          subBg: subCs ? subCs.backgroundColor : null,
          subBorder: subCs ? subCs.borderColor : null,
          refBg: refCs ? refCs.backgroundColor : null,
          refBorder: refCs ? refCs.borderColor : null,
          refTitleColor: refH4cs ? refH4cs.color : null
        };
      })()`);

      await captureScreenshot(path.join(outDir, `after-full-mais-${theme}.png`));
      results[theme].settingsPage = maisData;
    }

    console.log('FINAL_RESULTS:' + JSON.stringify(results, null, 2));

    ws.close();
    proc.kill();
  } catch (err) {
    console.error('Execution error:', err);
    try { proc.kill(); } catch {}
  }
}

run();
