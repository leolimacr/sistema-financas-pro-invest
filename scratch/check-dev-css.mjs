import fetch from 'node-fetch';

async function main() {
  try {
    const res = await fetch('http://localhost:5173/src/index.css');
    const css = await res.text();
    const hasMedia = css.includes('@media (prefers-color-scheme: dark)');
    const matchesDarkClass = (css.match(/\.dark\s/g) || []).length;
    const matchesMedia = (css.match(/prefers-color-scheme/g) || []).length;
    console.log('CSS length:', css.length);
    console.log('hasMedia prefers-color-scheme:', hasMedia, 'count:', matchesMedia);
    console.log('matches .dark class count:', matchesDarkClass);
    const sample = css.split('\n').filter(l => l.includes('.dark ')).slice(0, 5);
    console.log('Sample lines with .dark:\n' + sample.join('\n'));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
main();
