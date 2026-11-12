// tmp-audit-dead-exports.cjs · V4.15 审计⑥终版：去重 + 区分「全死」vs「仅 export 关键字死」（纯 fs；跑完即弃）
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : /\.ts$/.test(e.name) && !/\.d\.ts$/.test(e.name) ? [p] : [];
});
const targets = [...new Set([...walk(path.join(ROOT, 'src/core')), ...walk(path.join(ROOT, 'src/ui'))])];
const corpus = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'test'))].map((f) => ({ f, src: fs.readFileSync(f, 'utf8') }));
const fullyDead = [];
const exportOnlyDead = [];
for (const f of targets) {
  const src = fs.readFileSync(f, 'utf8');
  const names = [...src.matchAll(/export\s+(?:const|function|class|interface|type)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  for (const n of new Set(names)) {
    if (n.startsWith('_')) continue;
    const usedElsewhere = corpus.some(({ f: g, src: s }) => g !== f && s.includes(n));
    if (usedElsewhere) continue;
    // 自身文件内：去掉声明行后是否还有引用（子串级匹配，注释中的提及同样计入「在用」——
    // 即注释级引用的死符号不会被报死，属保守方向取舍；G0 Minor-2 勘正自述）
    const declRe = new RegExp(`export\\s+(?:const|function|class|interface|type)\\s+${n}\\b`);
    const rest = src.split('\n').filter((l) => !declRe.test(l)).join('\n');
    const selfRefs = rest.includes(n);
    (selfRefs ? exportOnlyDead : fullyDead).push(`${path.relative(ROOT, f).replace(/\\/g, '/')} :: ${n}${selfRefs ? '' : '  ← 全死(自身文件内零引用)'}`);
  }
}
console.log(`== 全死符号 ${fullyDead.length} 个（候选删除） ==`);
console.log(fullyDead.join('\n') || '(无)');
console.log(`\n== 仅 export 关键字死 ${exportOnlyDead.length} 个（符号本体自身文件内使用，候选取 export） ==`);
console.log(exportOnlyDead.join('\n') || '(无)');
