/**
 * weight.ts · 重量（W2-C1 实现：圆/六方/管/板 × 密度）
 * 体积 mm³ → 质量 kg：m = ρ(g/cm³) × V(mm³) / 1e6。
 * 公式来源：调研报告附录 B（报告:420-421）。
 */
import type { WeightInput, WeightResult, WeightShape } from './types';

/** 读取必需尺寸；缺项时报错（dims 为 Record，noUncheckedIndexedAccess 下可能为 undefined） */
function requireDim(dims: Record<string, number>, key: string, shape: WeightShape): number {
  const value = dims[key];
  if (value === undefined) {
    throw new Error(`barWeight: 形状 ${shape} 缺少尺寸 ${key}`);
  }
  return value;
}

export function barWeight(input: WeightInput): WeightResult {
  const { shape, dims, density } = input;
  let volumeMM3: number;

  switch (shape) {
    case 'round': {
      const D = requireDim(dims, 'D', shape);
      const L = requireDim(dims, 'L', shape);
      // 圆钢 V = πD²/4 · L
      volumeMM3 = ((Math.PI * D * D) / 4) * L;
      break;
    }
    case 'hex': {
      const S = requireDim(dims, 'S', shape);
      const L = requireDim(dims, 'L', shape);
      // 正六方（S = 对边距）：面积 = (√3/2)·S²（6 个边长 S/√3 的等边三角形合成）
      volumeMM3 = ((Math.sqrt(3) / 2) * S * S) * L;
      break;
    }
    case 'pipe': {
      const D = requireDim(dims, 'D', shape);
      const t = requireDim(dims, 't', shape);
      const L = requireDim(dims, 'L', shape);
      // 圆管：内径 d = D − 2t，V = π/4 · (D² − d²) · L
      const inner = D - 2 * t;
      volumeMM3 = (Math.PI / 4) * (D * D - inner * inner) * L;
      break;
    }
    case 'plate': {
      const W = requireDim(dims, 'W', shape);
      const T = requireDim(dims, 'T', shape);
      const L = requireDim(dims, 'L', shape);
      // 平板 V = W·T·L
      volumeMM3 = W * T * L;
      break;
    }
    default: {
      const unreachable: never = shape;
      throw new Error(`barWeight: 不支持的形状 ${String(unreachable)}`);
    }
  }

  const massKg = (volumeMM3 * density) / 1e6;
  return { volumeMM3, massKg };
}
