import fs from 'fs';
import path from 'path';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('dist') && !file.includes('scratch')) {
        walkDir(fullPath, fileList);
      }
    } else if (file.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const files = walkDir(path.join(process.cwd(), 'src'));
console.log(`Analisando ${files.length} arquivos .tsx em src/...`);

const findings = [];

files.forEach(f => {
  // Ignora arquivos de teste
  if (f.includes('__tests__') || f.endsWith('.test.tsx') || f.endsWith('.spec.tsx')) return;

  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Procura por bg-white ou bg-surface-primary ou bg-surface-secondary ou bg-slate-50/100 que não tenham dark:bg- na mesma linha ou no mesmo elemento
    if (line.includes('className=') || line.includes('class=')) {
      const hasLightBg = /\b(bg-white|bg-surface-primary|bg-surface-secondary|bg-surface-elevated|bg-slate-50|bg-slate-100)\b/.test(line);
      const hasDarkBg = /\bdark:bg-/.test(line);
      const hasDarkHook = content.includes('useTheme') || content.includes('isDark');

      if (hasLightBg && !hasDarkBg) {
        findings.push({
          file: path.relative(process.cwd(), f).replace(/\\/g, '/'),
          line: idx + 1,
          code: line.trim(),
          hasDarkHook
        });
      }
    }
  });
});

console.log(`Encontradas ${findings.length} linhas candidatas com background claro sem dark:bg- explícito.`);

// Agrupar por arquivo
const byFile = {};
findings.forEach(item => {
  if (!byFile[item.file]) byFile[item.file] = [];
  byFile[item.file].push(item);
});

console.log('\n--- ARQUIVOS COM MAIS OCORRÊNCIAS DE BACKGROUND CLARO SEM dark:bg- ---');
Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 30)
  .forEach(([file, items]) => {
    console.log(`${file.padEnd(65)} : ${items.length} ocorrências`);
  });
