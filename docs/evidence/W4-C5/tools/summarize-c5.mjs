#!/usr/bin/env node
/**
 * W4-C5 · 390×844 量测汇总脚本（判定行由脚本计算生成，人工只解读）
 *
 * 用法：node docs/evidence/W4-C5/tools/summarize-c5.mjs docs/evidence/W4-C5/runs/measure-390.json
 * 输出：固定顺序的纯文本摘要（stdout）；不修改原始 JSON。
 */

import { readFileSync } from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('usage: node summarize-c5.mjs <measure-390.json>');
  process.exit(1);
}

const report = JSON.parse(readFileSync(inputPath, 'utf8'));
const lines = [];

lines.push(`TOOL=${report.tool}`);
lines.push(`CHROME=${report.chromeVersion}`);
lines.push(
  `VIEWPORT=${report.viewport.width}x${report.viewport.height} dpr=${report.viewport.deviceScaleFactor} mobile=${report.viewport.mobile}`,
);
lines.push(`URL=${report.url}`);
lines.push('');
lines.push('PER_PAGE');
for (const page of report.pages) {
  lines.push(
    [
      `${page.pageId}`,
      `docScrollWidth=${page.documentElement.scrollWidth}`,
      `docClientWidth=${page.documentElement.clientWidth}`,
      `pageHOverflow=${page.pageHorizontalOverflow}`,
      `bodyHOverflow=${page.bodyHorizontalOverflow}`,
      `bodyVOverflow=${page.bodyVerticalOverflow}`,
      `counts=${JSON.stringify(page.counts)}`,
    ].join(' '),
  );
}
lines.push('');
lines.push(`ALL_PAGES_NO_HORIZONTAL_OVERFLOW=${report.allPagesNoHorizontalOverflow}`);
lines.push(
  `P14_DETAIL_PARAMS=${report.detailMetrics.counts.p14DetailParams} ` +
    `DETAIL_BODY_H_OVERFLOW=${report.detailMetrics.bodyHorizontalOverflow} ` +
    `DETAIL_BODY_V_OVERFLOW=${report.detailMetrics.bodyVerticalOverflow}`,
);
lines.push(`SHARE_DATA_URL_LENGTH=${report.sharePreview.dataUrlLength}`);
lines.push(`SHARE_DOWNLOAD_NAME=${report.sharePreview.downloadName}`);
lines.push(`SHARE_IMAGE_PATH=${report.shareImagePath}`);
lines.push(`SHARE_PROBE=${JSON.stringify(report.shareProbe)}`);
lines.push(`EXCEPTIONS=${report.exceptions.length}`);
lines.push(`CONSOLE_ERRORS=${report.consoleErrors.length}`);
if (report.consoleErrors.length > 0) {
  for (const error of report.consoleErrors) lines.push(`CONSOLE_ERROR=${error}`);
}

process.stdout.write(`${lines.join('\n')}\n`);
