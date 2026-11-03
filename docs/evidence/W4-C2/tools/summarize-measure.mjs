#!/usr/bin/env node
/**
 * W4-C2 · measure-390.json 判定行生成器
 *
 * 用法：node docs/evidence/W4-C2/tools/summarize-measure.mjs <measure-390.json>
 * 输出：逐目标宽度/行数/代码行 + 汇总判定行（全部由 JSON 计算，人工不填）。
 */
import { readFileSync } from 'node:fs';

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('usage: summarize-measure.mjs <measure-390.json>');
  process.exit(2);
}

const report = JSON.parse(readFileSync(jsonPath, 'utf8'));
const lines = [];
lines.push(`tool=${report.tool}`);
lines.push(`chromeVersion=${report.chromeVersion}`);
lines.push(`targetsMeasured=${report.summary.targetCount}`);
for (const item of report.results) {
  lines.push(`${item.name}.pageId=${item.pageId}`);
  lines.push(`${item.name}.scrollWidth=${item.documentElement.scrollWidth}`);
  lines.push(`${item.name}.clientWidth=${item.documentElement.clientWidth}`);
  lines.push(`${item.name}.horizontalOverflow=${item.horizontalOverflow}`);
  lines.push(`${item.name}.documentFitsHeight=${item.documentFitsHeight}`);
  if (item.pageId === 'p02') lines.push(`${item.name}.rowCount=${item.rowCount}`);
  if (item.codeLines.length > 0) {
    lines.push(`${item.name}.codeLines=${JSON.stringify(item.codeLines)}`);
  }
}
lines.push(`noHorizontalOverflow=${report.summary.noHorizontalOverflow}`);
lines.push(`allDocumentsFitHeight=${report.summary.allDocumentsFitHeight}`);
lines.push(`p02RowCounts=${JSON.stringify(report.summary.p02RowCounts)}`);
lines.push(`exceptions=${report.exceptions.length}`);
lines.push(`consoleErrors=${JSON.stringify(report.consoleErrors)}`);
process.stdout.write(`${lines.join('\n')}\n`);
