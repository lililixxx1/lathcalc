// W6-C1 结论表判定行生成器（脚本计算，人工只解读）
// 用法：node docs/evidence/W6-C1/tools/summarize.mjs <research.md>
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'docs/research/g76-dialects.md';
const text = readFileSync(file, 'utf8');

const rows = text
  .split(/\r?\n/)
  .filter((line) => /^\|\s*[1-9]\d*\s*\|/.test(line))
  .filter((line) => line.includes('| GSK |') || line.includes('| 华中 HNC |') || line.includes('| KND |'));

const enable = rows.filter((line) => line.includes('**enable**')).length;
const gray = rows.filter((line) => line.includes('**keep-gray**')).length;
const footnoted = rows.filter((line) => /\[\d+\]/.test(line)).length;
const missing = rows.filter((line) => !line.includes('**enable**') && !line.includes('**keep-gray**')).length;

console.log(`RESEARCH_FILE=${file}`);
console.log(`CONCLUSION_ROWS=${rows.length}`);
console.log(`ENABLE=${enable}`);
console.log(`KEEP_GRAY=${gray}`);
console.log(`FOOTNOTED_ROWS=${footnoted}`);
console.log(`ROWS_WITHOUT_RECOMMENDATION=${missing}`);

const pass = rows.length >= 6 && missing === 0 && footnoted === rows.length;
console.log(`JUDGEMENT=${pass ? 'PASS' : 'FAIL'}（行数≥6、每行有建议、每行有脚注编号）`);
process.exit(pass ? 0 : 1);
