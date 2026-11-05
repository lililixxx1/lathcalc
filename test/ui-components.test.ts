// @vitest-environment happy-dom
/**
 * W4-C1 · 基础组件契约测试
 *
 * 每个组件至少 1 例；断言打到 DOM 结构 / 类名 / 文本 / 事件行为（无恒真断言）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  Accordion,
  Badge,
  Button,
  Card,
  Chip,
  CodeCard,
  Eyebrow,
  HomeHeader,
  HomeIndicator,
  IconButton,
  InputRow,
  Keypad,
  ListRow,
  ParamGrid,
  ResultCard,
  RowList,
  Scale,
  Segmented,
  StatBlock,
  StatTriple,
  StatusBar,
  SubText,
  Tile,
  TileGrid,
  TopBar,
  WarnCard,
  codeCardText,
  resultCopyText,
} from '../src/ui/components';

afterEach(() => {
  document.body.replaceChildren();
});

describe('ResultCard', () => {
  it('渲染标签/数值/单位/大字号/等宽行，并回调复制内容', () => {
    const copied: Array<{ label: string; text: string }> = [];
    const card = ResultCard({
      items: [
        { label: '大径 d', value: '30.000', unit: 'mm' },
        { label: '切点 X', value: '18.536', unit: 'mm', big: true },
        { label: '程序行', value: 'G02 X18.536 Z−21.464 R5.0', mono: true, copy: false },
      ],
      onCopy: (item, text) => copied.push({ label: item.label, text }),
    });
    document.body.append(card);

    const rows = card.querySelectorAll('.la-resrow');
    expect(rows).toHaveLength(3);
    expect(card.classList.contains('la-card')).toBe(true);
    expect(card.classList.contains('tight')).toBe(true);
    expect(rows[0]?.querySelector('.la-reslab')?.textContent).toBe('大径 d');
    expect(rows[0]?.querySelector('.la-resval')?.textContent).toBe('30.000');
    expect(rows[0]?.querySelector('.la-unit')?.textContent).toBe('mm');
    expect(rows[1]?.querySelector('.la-resval')?.classList.contains('big')).toBe(true);
    expect(rows[2]?.querySelector('.rc-resultcard__mono')?.textContent).toBe(
      'G02 X18.536 Z−21.464 R5.0',
    );
    expect(rows[2]?.querySelector('.la-copy')).toBeNull();

    rows[0]?.querySelector<HTMLButtonElement>('.la-copy')?.click();
    expect(copied).toEqual([{ label: '大径 d', text: '30.000 mm' }]);
  });

  it('copyValue 覆盖默认复制文本', () => {
    expect(resultCopyText({ label: 'x', value: '1.5', unit: 'mm', copyValue: 'X1.5' })).toBe('X1.5');
    expect(resultCopyText({ label: 'x', value: '1.5' })).toBe('1.5');
  });
});

describe('InputRow', () => {
  it('渲染标签/单位/初始值，input 与 change 分别回调', () => {
    const inputs: string[] = [];
    const changes: string[] = [];
    const row = InputRow({
      label: '工件直径 D',
      value: '50',
      unit: 'mm',
      inputMode: 'decimal',
      name: 'diameter',
      onInput: (value) => inputs.push(value),
      onChange: (value) => changes.push(value),
    });
    document.body.append(row);

    expect(row.classList.contains('la-input')).toBe(true);
    expect(row.querySelector('.lab')?.textContent).toBe('工件直径 D');
    expect(row.querySelector('.unit')?.textContent).toBe('mm');

    const input = row.querySelector<HTMLInputElement>('.rc-input__field');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('50');
    expect(input?.getAttribute('inputmode')).toBe('decimal');
    expect(input?.name).toBe('diameter');

    if (input) {
      input.value = '50.5';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    expect(inputs).toEqual(['50.5']);
    expect(changes).toEqual(['50.5']);
  });
});

describe('SegChip', () => {
  it('Segmented 渲染选项、选中态与点击切换（含 small 变体）', () => {
    const changes: string[] = [];
    const seg = Segmented({
      options: [
        { value: 'metric', label: '普通 M' },
        { value: 'tr', label: '梯形 Tr' },
        { value: 'pipe', label: '55° 管' },
      ],
      value: 'metric',
      ariaLabel: '螺纹制式',
      onChange: (value) => changes.push(value),
    });
    document.body.append(seg);

    expect(seg.classList.contains('la-seg')).toBe(true);
    expect(seg.getAttribute('role')).toBe('tablist');
    expect(seg.getAttribute('aria-label')).toBe('螺纹制式');

    const items = seg.querySelectorAll<HTMLButtonElement>('.rc-seg__item');
    expect(items).toHaveLength(3);
    expect(items[0]?.classList.contains('on')).toBe(true);
    expect(items[0]?.getAttribute('aria-selected')).toBe('true');
    expect(items[1]?.getAttribute('aria-selected')).toBe('false');

    const target = items[1];
    if (!target) throw new Error('页签项缺失');
    const intoView = vi.spyOn(target, 'scrollIntoView'); // V3-A4-01：横滑页签选中项滚入视口
    target.click();
    expect(changes).toEqual(['tr']);
    expect(items[1]?.classList.contains('on')).toBe(true);
    expect(items[0]?.classList.contains('on')).toBe(false);
    expect(items[1]?.getAttribute('aria-selected')).toBe('true');
    expect(intoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' });

    const small = Segmented({
      options: [{ value: 'it7', label: 'IT7' }],
      value: 'it7',
      small: true,
      ariaLabel: '公差等级',
    });
    expect(small.classList.contains('small')).toBe(true);
  });

  it('Chip 渲染 active 态与点击回调', () => {
    let clicks = 0;
    const chip = Chip({ label: '粗牙', active: true, onClick: () => (clicks += 1) });
    document.body.append(chip);

    expect(chip.classList.contains('la-chip')).toBe(true);
    expect(chip.classList.contains('on')).toBe(true);
    expect(chip.textContent).toBe('粗牙');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    chip.click();
    expect(clicks).toBe(1);
  });
});

describe('Keypad', () => {
  it('固定 12 键顺序，点击回传键值（含 del）', () => {
    const keys: string[] = [];
    const pad = Keypad({ onKey: (key) => keys.push(key) });
    document.body.append(pad);

    const buttons = [...pad.querySelectorAll<HTMLButtonElement>('.rc-keypad__key')];
    expect(buttons).toHaveLength(12);
    expect(buttons.map((button) => button.dataset.key)).toEqual([
      '7',
      '8',
      '9',
      '4',
      '5',
      '6',
      '1',
      '2',
      '3',
      '.',
      '0',
      'del',
    ]);
    expect(buttons[11]?.getAttribute('aria-label')).toBe('退格');

    buttons[11]?.click();
    buttons[0]?.click();
    expect(keys).toEqual(['del', '7']);
  });
});

describe('Accordion', () => {
  it('默认折叠；点击展开并回调，内容保留受信 HTML', () => {
    const toggles: boolean[] = [];
    const acc = Accordion({
      content: 'd₂ = d − 0.6495P<br>依据：GB/T 196',
      onToggle: (open) => toggles.push(open),
    });
    document.body.append(acc);

    const head = acc.querySelector<HTMLButtonElement>('.rc-acc__head');
    const body = acc.querySelector<HTMLElement>('.rc-acc__body');
    expect(acc.querySelector('.rc-acc__title')?.textContent).toBe('怎么算的');
    expect(head?.getAttribute('aria-expanded')).toBe('false');
    expect(body?.hidden).toBe(true);

    head?.click();
    expect(toggles).toEqual([true]);
    expect(head?.getAttribute('aria-expanded')).toBe('true');
    expect(body?.hidden).toBe(false);
    expect(body?.innerHTML).toContain('0.6495P');
    expect(body?.querySelectorAll('br')).toHaveLength(1);

    head?.click();
    expect(toggles).toEqual([true, false]);
    expect(body?.hidden).toBe(true);
  });

  it('open=true 初始展开', () => {
    const acc = Accordion({ content: 'x', open: true });
    expect(acc.querySelector<HTMLElement>('.rc-acc__body')?.hidden).toBe(false);
    expect(acc.querySelector('.rc-acc__head')?.getAttribute('aria-expanded')).toBe('true');
  });
});

describe('CodeCard', () => {
  it('逐行渲染代码与注释，文本内容不解析为 HTML', () => {
    const card = CodeCard({
      lines: ['G76 P021060 Q100 R0.05', 'G76 X26.211 Z−30. P1895 Q400 F3.5', '<script>x</script>'],
      comment: '系统不同，P/Q/R 含义不同 — 已按 FANUC 生成',
    });
    document.body.append(card);

    expect(card.classList.contains('la-code')).toBe(true);
    expect(card.classList.contains('la-mono')).toBe(true);
    expect(card.querySelectorAll('.ln')).toHaveLength(3);
    expect(card.querySelector('.ln')?.textContent).toBe('G76 P021060 Q100 R0.05');
    expect(card.querySelector('.cm')?.textContent).toContain('FANUC');
    expect(card.querySelector('script')).toBeNull();
    expect(codeCardText({ lines: ['a', 'b'] })).toBe('a\nb');
  });
});

describe('WarnCard', () => {
  it('渲染警示文案与图标', () => {
    const warn = WarnCard({ text: '程序为参考模板。上机前请核对系统、刀具、材料与安全间距。' });
    document.body.append(warn);

    expect(warn.classList.contains('la-warn')).toBe(true);
    expect(warn.getAttribute('role')).toBe('note');
    expect(warn.querySelector('.rc-warn__text')?.textContent).toContain('参考模板');
    expect(warn.querySelector('.rc-warn__icon svg')).not.toBeNull();
  });
});

describe('Card 原子件', () => {
  it('Card 支持 tight / 子节点 / aria；Eyebrow / SubText / Badge 类名与文本', () => {
    const child = document.createElement('span');
    child.textContent = '子节点';
    const card = Card({ tight: true, ariaLabel: '测试卡', children: ['文本子节点', child] });
    document.body.append(card);

    expect(card.classList.contains('la-card')).toBe(true);
    expect(card.classList.contains('tight')).toBe(true);
    expect(card.getAttribute('aria-label')).toBe('测试卡');
    expect(card.textContent).toContain('文本子节点');
    expect(card.textContent).toContain('子节点');

    expect(Eyebrow('普通螺纹').className).toBe('la-eyebrow rc-eyebrow');
    expect(SubText('居中', { center: true }).classList.contains('rc-sub--center')).toBe(true);
    expect(Badge('示例数据', { gray: true }).classList.contains('gray')).toBe(true);
  });
});

describe('TopBar / HomeHeader', () => {
  it('TopBar 渲染标题、徽标、收藏按钮并回调返回/收藏', () => {
    let backs = 0;
    let stars = 0;
    const bar = TopBar({
      title: 'M30 × 3.5',
      badge: 'GB/T 196',
      star: true,
      onBack: () => (backs += 1),
      onStar: () => (stars += 1),
    });
    document.body.append(bar);

    expect(bar.classList.contains('la-top')).toBe(true);
    expect(bar.querySelector('h1')?.textContent).toContain('M30 × 3.5');
    expect(bar.querySelector('.la-badge')?.textContent).toBe('GB/T 196');
    bar.querySelector<HTMLButtonElement>('.rc-topbar__back')?.click();
    bar.querySelector<HTMLButtonElement>('.rc-topbar__star')?.click();
    expect(backs).toBe(1);
    expect(stars).toBe(1);
  });

  it('TopBar badgeGray 与无 star 变体', () => {
    const bar = TopBar({ title: '切削参数', badge: '示例数据', badgeGray: true });
    expect(bar.querySelector('.la-badge')?.classList.contains('gray')).toBe(true);
    expect(bar.querySelector('.rc-topbar__star')).toBeNull();
  });

  it('HomeHeader 渲染品牌名、副标与收藏回调', () => {
    let stars = 0;
    const head = HomeHeader({
      title: '车工算',
      eyebrow: 'LATHCALC · 离线车工计算器',
      onStar: () => (stars += 1),
    });
    document.body.append(head);

    expect(head.classList.contains('rc-home__head')).toBe(true);
    expect(head.querySelector('.la-logo svg')).not.toBeNull();
    expect(head.querySelector('.rc-home__title')?.textContent).toBe('车工算');
    expect(head.querySelector('.rc-home__tagline')?.textContent).toBe('LATHCALC · 离线车工计算器');
    head.querySelector<HTMLButtonElement>('.rc-home__star')?.click();
    expect(stars).toBe(1);
  });
});

describe('Tile', () => {
  it('首页磁贴渲染图标/名称/副标并回调', () => {
    let clicks = 0;
    const tile = Tile({
      icon: 'thread',
      name: '螺纹',
      sub: '底孔 · 三针 · 尺寸表',
      onClick: () => (clicks += 1),
    });
    document.body.append(tile);

    expect(tile.tagName).toBe('BUTTON');
    expect(tile.classList.contains('la-tile')).toBe(true);
    expect(tile.querySelector('.ticon svg')).not.toBeNull();
    expect(tile.querySelector('.tname')?.textContent).toBe('螺纹');
    expect(tile.querySelector('.tsub')?.textContent).toBe('底孔 · 三针 · 尺寸表');
    tile.click();
    expect(clicks).toBe(1);
  });

  it('compact 图库磁贴渲染自定义示意图', () => {
    const tile = Tile({
      name: '直线—圆弧相切',
      compact: true,
      graphic: '<svg data-case="01"></svg>',
    });
    expect(tile.classList.contains('rc-tile--compact')).toBe(true);
    expect(tile.querySelector('.rc-tile__graphic svg')?.getAttribute('data-case')).toBe('01');
    expect(tile.querySelector('.tname')?.textContent).toBe('直线—圆弧相切');
    expect(tile.querySelector('.tsub')).toBeNull();
  });

  it('TileGrid 使用两列网格类名', () => {
    const grid = TileGrid([Tile({ icon: 'tri', name: '三角' })], '入口');
    expect(grid.classList.contains('la-grid2')).toBe(true);
    expect(grid.getAttribute('aria-label')).toBe('入口');
    expect(grid.children).toHaveLength(1);
  });
});

describe('ListRow / RowList', () => {
  it('渲染选中态、数值、等宽名与复制图标', () => {
    let clicks = 0;
    const row = ListRow({
      name: 'M30 × 3.5',
      value: '27.727',
      selected: true,
      trailing: 'copy',
      onClick: () => (clicks += 1),
    });
    document.body.append(row);

    expect(row.classList.contains('la-lrow')).toBe(true);
    expect(row.classList.contains('sel')).toBe(true);
    expect(row.getAttribute('aria-current')).toBe('true');
    expect(row.querySelector('.grow')?.textContent).toBe('M30 × 3.5');
    expect(row.querySelector('.val')?.textContent).toBe('27.727');
    expect(row.querySelector('.rc-lrow__chev svg')).not.toBeNull();
    row.click();
    expect(clicks).toBe(1);
  });

  it('G 代码行使用 mono/description，RowList 汇总', () => {
    const row = ListRow({ name: 'G76', description: '螺纹切削复合循环', mono: true, trailing: 'none' });
    expect(row.querySelector('.rc-lrow__mono')?.classList.contains('la-mono')).toBe(true);
    expect(row.querySelector('.rc-lrow__desc')?.textContent).toBe('螺纹切削复合循环');
    expect(row.querySelector('.rc-lrow__chev')).toBeNull();

    const list = RowList([row], 'G 代码速查');
    expect(list.classList.contains('la-rowlist')).toBe(true);
    expect(list.getAttribute('aria-label')).toBe('G 代码速查');
  });
});

describe('Button', () => {
  it('primary / ghost 变体、图标与点击回调', () => {
    let clicks = 0;
    const primary = Button({ label: '生成 G76 程序', onClick: () => (clicks += 1) });
    expect(primary.classList.contains('la-btn')).toBe(true);
    expect(primary.classList.contains('ghost')).toBe(false);
    expect(primary.textContent).toContain('生成 G76 程序');
    primary.click();
    expect(clicks).toBe(1);

    const ghost = Button({ label: '复制程序', variant: 'ghost', icon: 'copy' });
    expect(ghost.classList.contains('ghost')).toBe(true);
    expect(ghost.querySelector('svg')).not.toBeNull();
  });
});

describe('IconButton', () => {
  it('渲染图标、aria-label 与点击回调', () => {
    let clicks = 0;
    const button = IconButton({ icon: 'share', ariaLabel: '分享', onClick: () => (clicks += 1) });
    document.body.append(button);

    expect(button.classList.contains('la-copy')).toBe(true);
    expect(button.classList.contains('rc-iconbtn')).toBe(true);
    expect(button.getAttribute('aria-label')).toBe('分享');
    expect(button.querySelector('svg')).not.toBeNull();
    button.click();
    expect(clicks).toBe(1);
  });
});

describe('ParamGrid', () => {
  it('默认三列，2 列变体与参数键值', () => {
    const grid = ParamGrid({
      items: [
        { key: '牙底 X', value: '26.211' },
        { key: '终点 Z', value: '−30.0' },
        { key: '牙高 P', value: '1895 μm' },
        { key: '首切 Q', value: '400 μm' },
        { key: '导程 F', value: '3.5' },
        { key: '精修 R', value: '0.05' },
      ],
      ariaLabel: '带入参数',
    });
    document.body.append(grid);

    expect(grid.classList.contains('rc-paramgrid')).toBe(true);
    expect(grid.classList.contains('rc-paramgrid--2')).toBe(false);
    expect(grid.querySelectorAll('.rc-param')).toHaveLength(6);
    expect(grid.querySelector('.rc-param__key')?.textContent).toBe('牙底 X');
    expect(grid.querySelector('.rc-param__value')?.textContent).toBe('26.211');

    const two = ParamGrid({ items: [{ key: 'a', value: '1' }], columns: 2 });
    expect(two.classList.contains('rc-paramgrid--2')).toBe(true);
  });
});

describe('StatBlock / StatTriple / Scale', () => {
  it('StatBlock 渲染眉标、数值、单位与脚注', () => {
    const foot = document.createElement('b');
    foot.textContent = '191';
    const stat = StatBlock({
      eyebrow: '主轴转速 n',
      value: '955',
      unit: 'r/min',
      footnote: foot,
    });
    document.body.append(stat);

    expect(stat.classList.contains('rc-stat')).toBe(true);
    expect(stat.querySelector('.rc-stat__eyebrow')?.textContent).toBe('主轴转速 n');
    expect(stat.querySelector('.rc-stat__value')?.textContent).toBe('955r/min');
    expect(stat.querySelector('.rc-stat__unit')?.textContent).toBe('r/min');
    expect(stat.querySelector('.rc-stat__foot b')?.textContent).toBe('191');
  });

  it('StatTriple 渲染三格与强调色', () => {
    const triple = StatTriple({
      items: [
        { value: '+0.025', label: '上偏差 ES' },
        { value: '0.000', label: '下偏差 EI' },
        { value: '0.025', label: '公差 T', accent: true },
      ],
    });
    expect(triple.querySelectorAll('.rc-stattriple__cell')).toHaveLength(3);
    expect(triple.querySelectorAll('.rc-stattriple__value--accent')).toHaveLength(1);
    expect(triple.querySelector('.rc-stattriple__label')?.textContent).toBe('上偏差 ES');
  });

  it('Scale 夹取 0–100 并写入标记位置', () => {
    const scale = Scale({ value: 63, ariaLabel: '转速区间' });
    expect(scale.classList.contains('la-scale')).toBe(true);
    expect(scale.getAttribute('role')).toBe('img');
    expect(scale.querySelector<HTMLElement>('.rc-scale__marker')?.style.left).toBe('63%');

    const clamped = Scale({ value: 180 });
    expect(clamped.querySelector<HTMLElement>('.rc-scale__marker')?.style.left).toBe('100%');
    const low = Scale({ value: -5 });
    expect(low.querySelector<HTMLElement>('.rc-scale__marker')?.style.left).toBe('0%');
  });
});

describe('StatusBar / HomeIndicator', () => {
  it('状态栏与 Home 指示条为装饰性节点', () => {
    const status = StatusBar();
    expect(status.classList.contains('la-status')).toBe(true);
    expect(status.getAttribute('aria-hidden')).toBe('true');
    expect(status.querySelector('.rc-status__time')?.textContent).toBe('9:41');

    const home = HomeIndicator();
    expect(home.classList.contains('la-home')).toBe(true);
    expect(home.getAttribute('aria-hidden')).toBe('true');
  });
});
