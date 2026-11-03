/**
 * weight.ts 黄金用例（W2-C1）
 * 公式：m = ρ·V；圆钢 V = πD²/4·L（报告附录 B，报告:420-421）；
 * 黄金值来源：WAVE-PLAN §4 #6。
 * 体积 mm³ → 质量 kg：V(mm³)/1000 = cm³，ρ(g/cm³)×V(cm³)/1000 = kg → 除以 1e6。
 */
import { describe, it, expect } from 'vitest';
import { barWeight } from '../src/core/weight';

describe('barWeight', () => {
  it('圆钢 D=50、L=100、ρ=7.85：V=196349.54 mm³、m=1.541344 kg → 显示 196350 / 1.54（WAVE-PLAN §4 #6）', () => {
    // V = π×D²/4×L = π×25²×100 = π×62500 = 196349.54084936208 mm³
    //   = 196.349540849362 cm³；显示取整 = 196350 mm³
    // m = ρ×V = 7.85 g/cm³ × 196.349540849362 cm³
    //   = 1541.343895667492 g = 1.5413438956674924 kg
    //   → 6 位小数 1.541344；显示 toFixed(2) = 1.54 kg
    const r = barWeight({ shape: 'round', dims: { D: 50, L: 100 }, density: 7.85 });
    expect(r.volumeMM3).toBeCloseTo(196349.540849, 6);
    expect(r.massKg).toBeCloseTo(1.541344, 6);
    expect(r.volumeMM3.toFixed(0)).toBe('196350');
    expect(r.massKg.toFixed(2)).toBe('1.54');
  });

  it('六方棒 S=20、L=100、ρ=7.85：面积=(√3/2)S²、V=34641.016151 mm³、m=0.271932 kg', () => {
    // 正六边形（S=对边距）可拆为 6 个边长 s=S/√3 的等边三角形：
    //   面积 = 6×(√3/4)s² = 6×(√3/4)×(S²/3) = (√3/2)S²
    //   = 0.8660254037844386×400 = 346.41016151377544 mm²
    // V = 346.41016151377544×100 = 34641.016151377544 mm³ → 6 位小数 34641.016151
    // m = 7.85×34641.016151377544/1e6 = 0.2719319767883137 kg → 6 位小数 0.271932
    const r = barWeight({ shape: 'hex', dims: { S: 20, L: 100 }, density: 7.85 });
    expect(r.volumeMM3).toBeCloseTo(34641.016151, 6);
    expect(r.massKg).toBeCloseTo(0.271932, 6);
    expect(r.volumeMM3.toFixed(0)).toBe('34641');
    expect(r.massKg.toFixed(2)).toBe('0.27');
  });

  it('圆管 D=60、t=5、L=100、ρ=7.85：V=27500π=86393.797974 mm³、m=0.678191 kg', () => {
    // 内径 d = D−2t = 60−10 = 50
    // V = π/4×(D²−d²)×L = π/4×(60²−50²)×100 = π/4×110000 = 27500π
    //   = 86393.79797371931 mm³ → 6 位小数 86393.797974
    // m = 7.85×86393.79797371931/1e6 = 0.6781913140936965 kg → 6 位小数 0.678191
    const r = barWeight({ shape: 'pipe', dims: { D: 60, t: 5, L: 100 }, density: 7.85 });
    expect(r.volumeMM3).toBeCloseTo(86393.797974, 6);
    expect(r.massKg).toBeCloseTo(0.678191, 6);
    expect(r.volumeMM3.toFixed(0)).toBe('86394');
    expect(r.massKg.toFixed(2)).toBe('0.68');
  });

  it('平板 W=100、T=10、L=200、ρ=2.70（铝）：V=200000 mm³、m=0.54 kg（验证密度入参）', () => {
    // V = W×T×L = 100×10×200 = 200000 mm³
    // m = 2.70 g/cm³ × 200000 mm³ / 1e6 = 0.54 kg（密度取报告 §6.4 铝 2.70）
    const r = barWeight({ shape: 'plate', dims: { W: 100, T: 10, L: 200 }, density: 2.7 });
    expect(r.volumeMM3).toBeCloseTo(200000, 6);
    expect(r.massKg).toBeCloseTo(0.54, 6);
    expect(r.massKg.toFixed(2)).toBe('0.54');
  });
});
