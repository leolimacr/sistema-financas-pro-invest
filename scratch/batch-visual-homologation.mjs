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

async function main() {
  const port = 9666;
  const chromePath = findChromePath();
  const profileDir = path.join(process.cwd(), 'scratch', 'cdp-profile-homologation');
  if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

  const screenshotDir = path.join(process.cwd(), 'scratch', 'homologation-screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

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
    // Setup authenticated demo mode for authenticated routes
    await evaluate(`sessionStorage.setItem('fpi_demo_mode', 'true')`);

    const routesToTest = [
      { item: 1, name: 'Public Home (Web)', path: '/', public: true },
      { item: 3, name: 'Autenticação (Login)', path: '/login', public: true },
      { item: 4, name: 'Autenticação (Cadastro)', path: '/register', public: true },
      { item: 5, name: 'Termos de Uso', path: '/termos', public: true },
      { item: 6, name: 'Política de Privacidade', path: '/privacidade', public: true },
      { item: 7, name: 'Download do App', path: '/download', public: true },
      { item: 8, name: 'Artigos Editoriais', path: '/artigos/investir-2026', public: true },
      { item: 9, name: 'Calculadora FIRE', path: '/ferramentas/fire', public: true },
      { item: 10, name: 'Juros Compostos', path: '/ferramentas/juros', public: true },
      { item: 11, name: 'Impacto da Inflação', path: '/ferramentas/inflacao', public: true },
      { item: 12, name: 'Alugar vs Financiar', path: '/ferramentas/alugar', public: true },
      { item: 13, name: 'Otimizador de Dívidas', path: '/ferramentas/dividas', public: true },
      { item: 14, name: 'Simulador de Dividendos', path: '/ferramentas/dividendos', public: true },
      { item: 15, name: 'À Vista vs Parcelado', path: '/ferramentas/compra-avista-parcelado', public: true },
      { item: 16, name: 'Central (Cockpit)', path: '/app/central', auth: true },
      { item: 17, name: 'Dashboard do Mês', path: '/app/dashboard', auth: true },
      { item: 18, name: 'Controla & Lançamentos', path: '/app/controla', auth: true },
      { item: 20, name: 'Agenda Financeira', path: '/app/agenda', auth: true },
      { item: 21, name: 'Discovery Hub', path: '/app/explorar', auth: true },
      { item: 22, name: 'Nexus AI Chat', path: '/app/ia', auth: true },
      { item: 23, name: 'Configurações (Mais)', path: '/app/mais', auth: true },
      { item: 24, name: 'Planos e Preços', path: '/app/mais/pricing', auth: true },
      { item: 25, name: 'Carteira Soberana', path: '/app/carteira', auth: true },
      { item: 26, name: 'Investimentos Legado', path: '/app/investimentos', auth: true },
      { item: 27, name: 'Bens & Passivos', path: '/app/passivos', auth: true },
      { item: 28, name: 'Gestão de Dívidas', path: '/app/minhas-dividas', auth: true },
      { item: 29, name: 'Gestão de Metas', path: '/app/metas', auth: true },
      { item: 30, name: 'Ambiente de Cursos (Track)', path: '/curso/investidor-iniciante', public: true },
      { item: 30, name: 'Ambiente de Cursos (Lição)', path: '/curso/investidor-iniciante/modulo-1/licao-1', public: true }
    ];

    const results = [];

    for (const route of routesToTest) {
      console.log(`\nVerificando Item ${route.item}: ${route.name} (${route.path})...`);
      await send('Page.navigate', { url: `http://localhost:5173${route.path}` });
      await sleep(1800);

      const routeResult = {
        item: route.item,
        name: route.name,
        path: route.path,
        light: null,
        dark: null
      };

      for (const th of ['light', 'dark']) {
        // Apply theme
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

        const inspectExpr = `(() => {
          const body = document.body;
          const root = document.getElementById('root');
          const header = document.querySelector('header');
          const main = document.querySelector('main');
          const firstCard = document.querySelector('.rounded-panel, .rounded-section, .rounded-2xl, .rounded-xl, article, section');
          const textEl = document.querySelector('h1, h2, h3, p, span');

          function rgbOf(el, prop) {
            if (!el) return 'none';
            return window.getComputedStyle(el)[prop];
          }

          return {
            theme: '${th}',
            htmlClass: document.documentElement.className,
            bodyBg: rgbOf(body, 'backgroundColor'),
            bodyColor: rgbOf(body, 'color'),
            headerBg: rgbOf(header, 'backgroundColor'),
            cardBg: rgbOf(firstCard, 'backgroundColor'),
            cardBorder: rgbOf(firstCard, 'borderColor'),
            textColor: rgbOf(textEl, 'color')
          };
        })()`;

        const data = await evaluate(inspectExpr);
        routeResult[th] = data;

        // Take screenshot
        const ss = await send('Page.captureScreenshot', { format: 'png' });
        if (ss?.result?.data) {
          const cleanName = route.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const fname = path.join(screenshotDir, `item-${route.item}-${cleanName}-${th}.png`);
          fs.writeFileSync(fname, Buffer.from(ss.result.data, 'base64'));
        }
      }

      results.push(routeResult);
      console.log(`  -> Light: body=${routeResult.light.bodyBg} | card=${routeResult.light.cardBg} | text=${routeResult.light.textColor}`);
      console.log(`  -> Dark : body=${routeResult.dark.bodyBg} | card=${routeResult.dark.cardBg} | text=${routeResult.dark.textColor}`);
    }

    // Now test specific interactive elements:
    console.log('\n--- Verificando Item 19: Calendário Mensal em /app/controla ---');
    await send('Page.navigate', { url: 'http://localhost:5173/app/controla' });
    await sleep(2000);
    // Switch to Calendar view
    await evaluate(`(() => {
      const calBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Calendário'));
      if (calBtn) calBtn.click();
    })()`);
    await sleep(800);
    for (const th of ['light', 'dark']) {
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
      await sleep(300);
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      if (ss?.result?.data) {
        fs.writeFileSync(path.join(screenshotDir, `item-19-calendario-${th}.png`), Buffer.from(ss.result.data, 'base64'));
      }
    }
    console.log('  -> Calendário capturado em Light e Dark.');

    // Item 31: TransactionForm Modal
    console.log('\n--- Verificando Item 31: TransactionForm Modal ---');
    await evaluate(`(() => {
      const addBtn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'Lançar' || b.innerText.includes('Lançar') || b.innerText.includes('Novo Lançamento'));
      if (addBtn) addBtn.click();
    })()`);
    await sleep(800);
    for (const th of ['light', 'dark']) {
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
      await sleep(300);
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      if (ss?.result?.data) {
        fs.writeFileSync(path.join(screenshotDir, `item-31-modal-transacao-${th}.png`), Buffer.from(ss.result.data, 'base64'));
      }
    }
    console.log('  -> Modal TransactionForm capturado em Light e Dark.');

    // Close modal
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Fechar"]') || document.querySelector('.fixed button');
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(500);

    // Item 37: NotificationHub
    console.log('\n--- Verificando Item 37: NotificationHub Drawer ---');
    await evaluate(`(() => {
      const bell = document.querySelector('header button svg.lucide-bell')?.closest('button');
      if (bell) bell.click();
    })()`);
    await sleep(800);
    for (const th of ['light', 'dark']) {
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
      await sleep(300);
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      if (ss?.result?.data) {
        fs.writeFileSync(path.join(screenshotDir, `item-37-notification-hub-${th}.png`), Buffer.from(ss.result.data, 'base64'));
      }
    }
    console.log('  -> NotificationHub capturado em Light e Dark.');

    // Close notification hub
    await evaluate(`(() => {
      const closeBtn = document.querySelector('button[aria-label="Fechar"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Fechar'));
      if (closeBtn) closeBtn.click();
    })()`);
    await sleep(500);

    // Item 41: DownloadQrModal
    console.log('\n--- Verificando Item 41: DownloadQrModal ---');
    await evaluate(`(() => {
      const qrBtn = Array.from(document.querySelectorAll('header button')).find(b => b.innerText.includes('Baixar App'));
      if (qrBtn) qrBtn.click();
    })()`);
    await sleep(800);
    for (const th of ['light', 'dark']) {
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
      await sleep(300);
      const ss = await send('Page.captureScreenshot', { format: 'png' });
      if (ss?.result?.data) {
        fs.writeFileSync(path.join(screenshotDir, `item-41-download-qr-modal-${th}.png`), Buffer.from(ss.result.data, 'base64'));
      }
    }
    console.log('  -> DownloadQrModal capturado em Light e Dark.');

    fs.writeFileSync(path.join(process.cwd(), 'scratch', 'batch-homologation-results.json'), JSON.stringify(results, null, 2));
    console.log('\n=== HOMOLOGAÇÃO VISUAL EM LOTE FINALIZADA COM SUCESSO! ===');

    ws.close();
  } finally {
    try { proc.kill(); } catch {}
  }
}

main().catch(console.error);
