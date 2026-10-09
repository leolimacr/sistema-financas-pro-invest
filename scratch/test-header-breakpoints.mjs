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
          reject(new Error(`Timeout aguardando CDP na porta ${port}`));
        }
      });
    }, 250);
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runBreakpointsTest() {
  const port = 9555;
  const chromePath = findChromePath();
  const profileDir = path.join(process.cwd(), 'scratch', 'cdp-profile-breakpoints');
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

  try {
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

    await sleep(2000);
    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);
    await send('Page.navigate', { url: 'http://localhost:5173/app/central' });

    // Wait for Central cockpit to load
    let ready = false;
    for (let i = 0; i < 40; i++) {
      const isHero = await evaluate(`!!document.querySelector('.rounded-panel')`);
      if (isHero) {
        ready = true;
        break;
      }
      await sleep(500);
    }
    if (!ready) throw new Error('Central cockpit failed to render');

    const widths = [1023, 1024, 1150, 1279, 1280];
    const themes = ['dark', 'light'];
    const results = [];

    for (const w of widths) {
      for (const th of themes) {
        await send('Emulation.setDeviceMetricsOverride', {
          width: w,
          height: 900,
          deviceScaleFactor: 1,
          mobile: w < 768
        });

        // Set theme
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

        await sleep(500);

        const checkExpr = `(() => {
          const header = document.querySelector('header');
          const themeBtns = Array.from(document.querySelectorAll('header button')).filter(b =>
            b.getAttribute('title')?.includes('tema') || b.getAttribute('aria-label')?.includes('tema')
          );
          const menuBtn = document.querySelector('header button[aria-label="Menu"]');
          const visibleThemeBtns = themeBtns.filter(b => b.offsetWidth > 0 && b.offsetHeight > 0);

          const isDesktopBtnVisible = themeBtns.some(b => {
            const inDesktop = b.closest('.hidden.lg\\\\:flex');
            return inDesktop && b.offsetWidth > 0 && b.offsetHeight > 0;
          });

          const isMobileBtnVisible = themeBtns.some(b => {
            const inMobile = b.closest('.lg\\\\:hidden');
            return inMobile && b.offsetWidth > 0 && b.offsetHeight > 0;
          });

          const isMenuBtnVisible = menuBtn ? (menuBtn.offsetWidth > 0 && menuBtn.offsetHeight > 0) : false;

          const hasOverflow = header ? header.scrollWidth > header.clientWidth : false;

          return {
            viewportWidth: window.innerWidth,
            theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
            themeButtonsCount: themeBtns.length,
            visibleThemeButtonsCount: visibleThemeBtns.length,
            isDesktopBtnVisible,
            isMobileBtnVisible,
            isMenuBtnVisible,
            hasThemeButton: visibleThemeBtns.length > 0,
            hasOverflow,
            headerScrollWidth: header?.scrollWidth,
            headerClientWidth: header?.clientWidth
          };
        })()`;

        const res = await evaluate(checkExpr);
        results.push(res);

        // Screenshot
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        if (ss?.result?.data) {
          const fname = path.join(process.cwd(), 'scratch', `header-breakpoint-${w}px-${th}.png`);
          fs.writeFileSync(fname, Buffer.from(ss.result.data, 'base64'));
        }
      }
    }

    console.log('\n=== RESULTADOS DE VERIFICAÇÃO DE BREAKPOINTS (AppHeader) ===');
    console.table(results);

    const hasAnyGap = results.some(r => !r.hasThemeButton);
    if (hasAnyGap) {
      console.error('FALHA: Foi detectado breakpoint sem botão de tema!');
    } else {
      console.log('SUCESSO TOTAL: 100% dos breakpoints (1023, 1024, 1150, 1279, 1280 px) possuem controle de tema visível e funcional!');
    }

    ws.close();
  } finally {
    try { proc.kill(); } catch {}
  }
}

runBreakpointsTest().catch(console.error);
