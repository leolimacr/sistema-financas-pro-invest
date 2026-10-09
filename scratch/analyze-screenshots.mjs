import fs from 'fs';
import path from 'path';

const dir = 'scratch/homologation-screenshots';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));

const rows = files.map(f => {
  const p = path.join(dir, f);
  const size = fs.statSync(p).size;
  let type = 'Renderizado';
  if (size >= 5240 && size <= 5260) {
    type = 'Em branco (vazio / descarte)';
  } else if (size >= 418000 && size <= 427000) {
    type = 'AppLoadingScreen (Suspense fallback)';
  } else if (size >= 73000 && size <= 79000 && (f.includes('explorar') || f.includes('agenda') || f.includes('mais'))) {
    type = 'DashboardSkeleton (Suspense fallback)';
  }
  return { file: f, size, type };
});

rows.sort((a, b) => a.file.localeCompare(b.file));

console.log('| Arquivo | Tamanho | Classificação Real |');
console.log('|---|---|---|');
rows.forEach(r => {
  console.log(`| ${r.file} | ${r.size.toLocaleString('pt-BR')} B | ${r.type} |`);
});
