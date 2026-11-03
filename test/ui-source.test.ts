/**
 * W4-C1 · UI 源码契约扫描（node 环境，无 DOM）
 *
 * 断言：无十六进制色值字面量、无硬编码字体栈、la- token 引用全部存在、
 * 七件必需组件齐套、14 页 loader 可在无 DOM 环境加载。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PAGES, PAGE_IDS } from '../src/ui/router';

const UI_DIR = fileURLToPath(new URL('../src/ui', import.meta.url));
const UI_COMPONENTS_DIR = join(UI_DIR, 'components');

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectTsFiles(full));
    else if (entry.name.endsWith('.ts')) files.push(full);
  }
  return files;
}

const uiFiles = collectTsFiles(UI_DIR);
const tokensCss = readFileSync(join(UI_DIR, 'tokens.css'), 'utf8');
const tokenNames = new Set(
  [...tokensCss.matchAll(/--la-[a-z0-9-]+/g)].map((match) => match[0]),
);

describe('UI 源码契约', () => {
  it('七件必需组件文件齐套（另含页面骨架等扩展件）', () => {
    const required = [
      'ResultCard.ts',
      'InputRow.ts',
      'SegChip.ts',
      'Keypad.ts',
      'Accordion.ts',
      'CodeCard.ts',
      'WarnCard.ts',
    ];
    const names = readdirSync(UI_COMPONENTS_DIR);
    for (const name of required) expect(names).toContain(name);
    expect(uiFiles.length).toBeGreaterThanOrEqual(10);
  });

  it('组件 / 页面 / 路由源码无十六进制色值字面量', () => {
    const offenders: string[] = [];
    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8');
      if (/#[0-9a-fA-F]{3,8}\b/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it('无硬编码字体栈（font-family 只允许 var(--la-font*) 或 inherit）', () => {
    const offenders: string[] = [];
    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/font-family:\s*([^;}\n]+)/g)) {
        const value = (match[1] ?? '').trim();
        const allowed = value === 'inherit' || /^var\(--la-font(-num|-mono)?\)$/.test(value);
        if (!allowed) offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('所有 var(--la-*) 引用都存在于 tokens.css，且组件不新增/覆盖 la- 变量', () => {
    const missing: string[] = [];
    const redefinitions: string[] = [];
    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(/var\((--la-[a-z0-9-]+)/g)) {
        const name = match[1] as string;
        if (!tokenNames.has(name)) missing.push(`${file}: ${name}`);
      }
      if (/--la-[a-z0-9-]+\s*:/.test(source)) redefinitions.push(file);
    }
    expect(missing).toEqual([]);
    expect(redefinitions).toEqual([]);
  });

  it('tokens.css 冻结变量存在（抽查核心语义变量）', () => {
    for (const name of [
      '--la-bg',
      '--la-card',
      '--la-ink',
      '--la-sub',
      '--la-border',
      '--la-accent',
      '--la-accent-ink',
      '--la-code-bg',
      '--la-code-green',
      '--la-warn-bg',
      '--la-font',
      '--la-font-num',
      '--la-font-mono',
      '--la-r-ctl',
      '--la-r-card',
      '--la-r-lg',
      '--la-touch',
      '--la-keycap',
    ]) {
      expect(tokensCss).toContain(`${name}:`);
    }
  });

  it('14 页 loader 在无 DOM 环境均可解析，且模块含 title/render', async () => {
    expect(PAGE_IDS).toHaveLength(14);
    expect(Object.keys(PAGES)).toHaveLength(14);
    for (const pageId of PAGE_IDS) {
      const module = await PAGES[pageId]();
      expect(module.title.length).toBeGreaterThan(0);
      expect(typeof module.render).toBe('function');
    }
  });

  it('契约文档 src/ui/README.md 存在且覆盖核心章节', () => {
    const readme = readFileSync(join(UI_DIR, 'README.md'), 'utf8');
    for (const heading of [
      '组件清单',
      '页面骨架',
      '路由',
      '页面间传参',
      '测试范式',
      '样式范式',
    ]) {
      expect(readme).toContain(heading);
    }
    expect(readme).toContain('happy-dom');
  });
});
