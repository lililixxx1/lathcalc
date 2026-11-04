// eslint.config.js · ESLint 9 flat config（W7 收口引入，V2-2 用户裁决；运行时零依赖承诺不变——仅 devDependencies）
// 门禁口径：npm run lint 必须 0 error 0 warning（WAVE-PLAN-V2 §0 A1 四门禁）。
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // dist=构建产物；docs=证据/调研冻结档（不改写历史，不纳入 lint）；team-prompt=台账（gitignored）
  { ignores: ['dist/', 'docs/', 'team-prompt/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 与 tsc --noEmit 重复的检查交给 tsc（门禁一），lint 不做类型级重复
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
);
