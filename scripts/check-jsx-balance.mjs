import { readFileSync } from 'fs';
const src = readFileSync('/home/z/my-project/src/app/(dashboard)/tracking/page.tsx', 'utf-8');
const lines = src.split('\n');
let depth = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const openMatches = line.match(/<div[\s>]/g);
  const closeMatches = line.match(/<\/div>/g);
  const opens = openMatches ? openMatches.length : 0;
  const closes = closeMatches ? closeMatches.length : 0;
  depth += opens - closes;
  if (opens || closes) {
    const num = String(i + 1).padStart(4);
    const o = opens > 0 ? '+'.repeat(opens) : '';
    const c = closes > 0 ? '-'.repeat(closes) : '';
    console.log(`${num} | ${o}${c}  depth=${depth}  ${line.trim().substring(0, 80)}`);
  }
}
console.log('\nFinal depth:', depth);
