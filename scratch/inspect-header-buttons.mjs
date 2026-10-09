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
  const port = 9710;
  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.cwd(), 'scratch', 'cdp-profile-header-btn')}`,
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
    await sleep(2000);

    const outDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // Function to inspect header buttons
    async function inspectButtons(label) {
      return await evaluate(`(() => {
        const header = document.querySelector('header');
        if (!header) return { error: 'header not found' };

        // Find Baixar App button
        const buttons = Array.from(header.querySelectorAll('button'));
        const baixarBtn = buttons.find(b => b.textContent.includes('Baixar App'));
        let baixarData = null;
        if (baixarBtn) {
          const cs = window.getComputedStyle(baixarBtn);
          const icon = baixarBtn.querySelector('svg');
          const iconCs = icon ? window.getComputedStyle(icon) : null;
          baixarData = {
            text: baixarBtn.textContent.trim(),
            bg: cs.backgroundColor,
            color: cs.color,
            border: cs.borderColor,
            iconColor: iconCs ? iconCs.color : null,
            visible: cs.display !== 'none'
          };
        }

        // Find Premium badge
        const divs = Array.from(header.querySelectorAll('[role="status"], div, span'));
        const premiumBadge = divs.find(d => d.textContent.trim() === 'Premium' || d.getAttribute('aria-label') === 'Plano Premium');
        let premiumData = null;
        if (premiumBadge) {
          const target = premiumBadge.hasAttribute('role') ? premiumBadge : premiumBadge.closest('[role="status"]') || premiumBadge;
          const cs = window.getComputedStyle(target);
          const icon = target.querySelector('svg');
          const iconCs = icon ? window.getComputedStyle(icon) : null;
          premiumData = {
            text: target.textContent.trim(),
            bg: cs.backgroundColor,
            color: cs.color,
            border: cs.borderColor,
            iconColor: iconCs ? iconCs.color : null,
            visible: cs.display !== 'none'
          };
        }

        return {
          label: '${label}',
          headerBg: window.getComputedStyle(header).backgroundColor,
          baixarBtn: baixarData,
          premiumBadge: premiumData
        };
      })()`);
    }

    // 1. Logged in - 1440px - Dark
    await evaluate(`(() => {
      sessionStorage.setItem('fpi_demo_mode', 'true');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);
    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
    await sleep(2500);

    const dark1440 = await inspectButtons('logged-dark-1440');
    let ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 80, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 2. Logged in - 1150px - Dark (faixa 1024 a 1279px)
    await send('Emulation.setDeviceMetricsOverride', { width: 1150, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    const dark1150 = await inspectButtons('logged-dark-1150');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1150, height: 80, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1150.png'), Buffer.from(ss.result.data, 'base64'));

    // 3. Logged in - 390px - Dark (mobile)
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    const dark390 = await inspectButtons('logged-dark-390');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 80, scale: 2 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-390.png'), Buffer.from(ss.result.data, 'base64'));

    // Reset metrics to 1440
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // 4. Logged in - 1440px - Light
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(500);
    const light1440 = await inspectButtons('logged-light-1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 80, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-light-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 5. Visitor - 1440px - Dark
    await evaluate(`(() => {
      sessionStorage.removeItem('fpi_demo_mode');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);
    const visitorDark = await inspectButtons('visitor-dark-1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 80, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-visitor-dark-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 6. Visitor - 1440px - Light
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(500);
    const visitorLight = await inspectButtons('visitor-light-1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 80, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-visitor-light-1440.png'), Buffer.from(ss.result.data, 'base64'));

    console.log('INITIAL_HEADER_INSPECTION:\n' + JSON.stringify({
      dark1440,
      dark1150,
      dark390,
      light1440,
      visitorDark,
      visitorLight
    }, null, 2));

    ws.close();
    proc.kill();
  } catch (err) {
    console.error('Error:', err);
    try { proc.kill(); } catch {}
  }
}

run();
