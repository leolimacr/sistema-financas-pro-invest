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
        if (++retries > 40) {
          clearInterval(interval);
          reject(new Error('Timeout connecting to Chrome CDP'));
        }
      });
    }, 200);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function run() {
  const port = 9812;
  const userDir = path.join(process.cwd(), 'scratch', 'cdp-profile-header-val');
  if (fs.existsSync(userDir)) {
    try { fs.rmSync(userDir, { recursive: true, force: true }); } catch {}
  }

  const proc = spawn(findChromePath(), [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDir}`,
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
    await send('DOM.enable');

    const outDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    async function waitForSelector(sel, timeout = 10000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const found = await evaluate(`!!document.querySelector('${sel}')`);
        if (found) return true;
        await sleep(200);
      }
      throw new Error(`Timeout waiting for selector: ${sel}`);
    }

    // Prepare logged-in state
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1000);
    await evaluate(`(() => {
      sessionStorage.setItem('fpi_demo_mode', 'true');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);

    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });
    await waitForSelector('header');
    await sleep(1500);

    // Helper to inject mock Premium and Pro badges if not present in the DOM
    await evaluate(`(() => {
      const header = document.querySelector('header');
      if (!header) return;

      // Check if desktop Premium badge already exists
      let prem = header.querySelector('[data-testid="mock-premium-badge"]');
      if (!prem) {
        prem = document.createElement('div');
        prem.setAttribute('data-testid', 'mock-premium-badge');
        prem.setAttribute('role', 'status');
        prem.setAttribute('aria-label', 'Plano Premium');
        prem.className = 'hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 mr-4 animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_rgba(16,185,129,0.1)] dark:shadow-[0_0_12px_rgba(16,185,129,0.15)]';
        prem.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400 shrink-0"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg><span class="text-[10px] font-black uppercase tracking-wider">Premium</span>\`;

        // Insert right after Baixar App or before user greeting container
        const userContainer = header.querySelector('.border-r');
        if (userContainer) {
          userContainer.parentNode.insertBefore(prem, userContainer);
        }
      }

      // Check if mobile Premium badge exists
      let mobPrem = header.querySelector('[data-testid="mock-mobile-premium-badge"]');
      if (!mobPrem) {
        mobPrem = document.createElement('div');
        mobPrem.setAttribute('data-testid', 'mock-mobile-premium-badge');
        mobPrem.setAttribute('role', 'status');
        mobPrem.setAttribute('aria-label', 'Plano Premium');
        mobPrem.className = 'lg:hidden flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-none dark:ring-1 dark:ring-emerald-500/40 mr-2';
        mobPrem.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/></svg>\`;

        const mobGreeting = header.querySelector('.lg\\\\:hidden.flex.flex-col');
        if (mobGreeting) {
          mobGreeting.parentNode.insertBefore(mobPrem, mobGreeting);
        }
      }
    })()`);

    async function inspectAll(label) {
      return await evaluate(`(() => {
        const header = document.querySelector('header');
        if (!header) return { error: 'header not found' };

        // 1. Logged in Baixar App button
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
            boxShadow: cs.boxShadow,
            iconColor: iconCs ? iconCs.color : null,
            visible: cs.display !== 'none'
          };
        }

        // 2. Desktop Premium Badge
        const premBadge = header.querySelector('[data-testid="mock-premium-badge"]') || header.querySelector('[aria-label="Plano Premium"]');
        let premData = null;
        if (premBadge) {
          const cs = window.getComputedStyle(premBadge);
          const icon = premBadge.querySelector('svg');
          const iconCs = icon ? window.getComputedStyle(icon) : null;
          premData = {
            text: premBadge.textContent.trim(),
            bg: cs.backgroundColor,
            color: cs.color,
            border: cs.borderColor,
            boxShadow: cs.boxShadow,
            iconFill: iconCs ? iconCs.fill : null,
            iconColor: iconCs ? iconCs.color : null,
            visible: cs.display !== 'none'
          };
        }

        // 3. Mobile Premium Badge
        const mobPremBadge = header.querySelector('[data-testid="mock-mobile-premium-badge"]');
        let mobPremData = null;
        if (mobPremBadge) {
          const cs = window.getComputedStyle(mobPremBadge);
          mobPremData = {
            bg: cs.backgroundColor,
            color: cs.color,
            boxShadow: cs.boxShadow,
            visible: cs.display !== 'none'
          };
        }

        return {
          label: '${label}',
          headerBg: window.getComputedStyle(header).backgroundColor,
          headerBorder: window.getComputedStyle(header).borderBottomColor,
          baixarBtn: baixarData,
          premBadge: premData,
          mobPremBadge: mobPremData
        };
      })()`);
    }

    const results = {};

    // 1. Desktop 1440px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);
    await sleep(500);
    results['logged_dark_1440'] = await inspectAll('logged_dark_1440');
    let ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 2. Tablet 1150px (Faixa 1024 - 1279px) - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 1150, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    results['logged_dark_1150'] = await inspectAll('logged_dark_1150');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1150, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1150.png'), Buffer.from(ss.result.data, 'base64'));

    // 3. Boundary 1024px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    results['logged_dark_1024'] = await inspectAll('logged_dark_1024');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1024, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1024.png'), Buffer.from(ss.result.data, 'base64'));

    // 4. Boundary 1279px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 1279, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    results['logged_dark_1279'] = await inspectAll('logged_dark_1279');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1279, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-1279.png'), Buffer.from(ss.result.data, 'base64'));

    // 5. Mobile 390px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    results['logged_dark_390'] = await inspectAll('logged_dark_390');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 75, scale: 2 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-dark-390.png'), Buffer.from(ss.result.data, 'base64'));

    // 6. Desktop 1440px - Light (Verify zero regressions)
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(500);
    results['logged_light_1440'] = await inspectAll('logged_light_1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-light-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 7. Tablet 1150px - Light
    await send('Emulation.setDeviceMetricsOverride', { width: 1150, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(500);
    results['logged_light_1150'] = await inspectAll('logged_light_1150');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1150, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-light-1150.png'), Buffer.from(ss.result.data, 'base64'));

    // 8. Mobile 390px - Light
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await sleep(500);
    results['logged_light_390'] = await inspectAll('logged_light_390');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 75, scale: 2 } });
    fs.writeFileSync(path.join(outDir, 'header-logged-light-390.png'), Buffer.from(ss.result.data, 'base64'));

    // 9. Visitor 1440px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await evaluate(`(() => {
      sessionStorage.removeItem('fpi_demo_mode');
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await waitForSelector('header');
    await sleep(1500);
    results['visitor_dark_1440'] = await inspectAll('visitor_dark_1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-visitor-dark-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 10. Visitor 1440px - Light
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'light');
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    })()`);
    await sleep(500);
    results['visitor_light_1440'] = await inspectAll('visitor_light_1440');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 1440, height: 75, scale: 1 } });
    fs.writeFileSync(path.join(outDir, 'header-visitor-light-1440.png'), Buffer.from(ss.result.data, 'base64'));

    // 11. Visitor 390px - Dark
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await evaluate(`(() => {
      localStorage.setItem('fpi_theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    })()`);
    await sleep(500);
    results['visitor_dark_390'] = await inspectAll('visitor_dark_390');
    ss = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: 390, height: 75, scale: 2 } });
    fs.writeFileSync(path.join(outDir, 'header-visitor-dark-390.png'), Buffer.from(ss.result.data, 'base64'));

    console.log('COMPREHENSIVE_HEADER_RESULTS:\n' + JSON.stringify(results, null, 2));

    ws.close();
    proc.kill();
  } catch (err) {
    console.error('Test Execution Error:', err);
    try { proc.kill(); } catch {}
  }
}

run();
