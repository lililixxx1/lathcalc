/**
 * 车工算 LathCalc · 线性图标库（1:1 移植自设计稿 ICONS 表）
 *
 * 仅输出 SVG 标记字符串（currentColor），颜色由宿主 CSS 决定，禁止内联色值。
 */

const ICON_PATHS = {
  back: '<path d="M14.5 5.5 8 12l6.5 6.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>',
  star: '<path d="m12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/>',
  copy: '<rect x="9" y="9" width="10.5" height="10.5" rx="2"/><path d="M5.5 14.5v-8a2 2 0 0 1 2-2h8"/>',
  chev: '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
  chevd: '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
  share: '<circle cx="6.5" cy="12" r="2.1"/><circle cx="17" cy="6" r="2.1"/><circle cx="17" cy="18" r="2.1"/><path d="m8.4 10.9 6.7-3.8M8.4 13.1l6.7 3.8"/>',
  ruler: '<rect x="2.8" y="8.2" width="18.4" height="7.6" rx="1.4"/><path d="M6.8 8.2v3.6M10.9 8.2v2.4M15 8.2v3.6M19.1 8.2v2.4"/>',
  thread: '<circle cx="12" cy="6.2" r="2.9"/><path d="M10 9.5h4l-.8 10.7h-2.4z"/>',
  gcode: '<path d="m8.5 8-4 4 4 4"/><path d="m15.5 8 4 4-4 4"/><path d="M13 6.5 11 17.5"/>',
  arc: '<path d="M4.5 19.5A15 15 0 0 1 19.5 4.5"/><circle cx="4.5" cy="19.5" r="1.5"/><circle cx="19.5" cy="4.5" r="1.5"/>',
  taper: '<path d="M7.2 4.5h9.6l-2.4 15H9.6z"/><path d="M4.5 19.5h15"/>',
  tol: '<rect x="3.8" y="9" width="16.4" height="6" rx="1.2"/><path d="M8 9v6M12 9v6M16 9v6"/>',
  speed: '<path d="M4.5 16.5a7.5 7.5 0 1 1 15 0"/><path d="m12 13.5 3.4-3.4"/><circle cx="12" cy="15" r="1.4"/>',
  cutting: '<path d="M5 19 14.8 5.6l3.6 3.6L9 20z"/><path d="m12.6 9.4 2 2"/>',
  weight: '<path d="M9.8 7.2a2.6 2.6 0 1 1 4.4 0"/><rect x="4.8" y="7.2" width="14.4" height="12.6" rx="2"/>',
  tri: '<path d="M12 4.5 20.5 19h-17z"/>',
  book: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M9 7.5h6"/>',
  warn: '<path d="M12 4.5 21 19.5H3z"/><path d="M12 10.2v3.6"/><path d="M12 16.4h.01"/>',
  calc: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 7.5h7"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>',
  del: '<path d="M8.6 5h10.4a1.6 1.6 0 0 1 1.6 1.6v10.8a1.6 1.6 0 0 1-1.6 1.6H8.6L3 12z"/><path d="m11.5 9.5 5 5M16.5 9.5l-5 5"/>',
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** 返回内联 SVG 字符串（currentColor 描边）。 */
export function icon(name: IconName, size = 20, strokeWidth = 1.7): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name]}</svg>`;
}
