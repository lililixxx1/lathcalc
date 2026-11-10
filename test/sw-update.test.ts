/**
 * V4.12-C · sw-update 单元测试（SW 更新即刷新）
 *
 * 三分支守卫（模块头注机理）：
 *   ① 已被 SW 控制的页面（wasControlled）遇 controllerchange → reload 恰一次（二次事件不重复刷）；
 *   ② 首次安装（controller 为 null → 新 SW 接管）不刷（防装完即刷循环）；
 *   ③ 无 SW 环境（container undefined，http 非 localhost / 旧浏览器）安全空操作不抛错。
 * 依赖全注入（容器 stub + reload spy），零浏览器全局。
 */
import { describe, expect, it, vi } from 'vitest';
import { installUpdateReload, type UpdateReloadContainer } from '../src/ui/sw-update';

interface MutableContainer extends UpdateReloadContainer {
  controller: unknown | null;
  listeners: Array<() => void>;
  fire(): void;
}

function makeContainer(initialController: unknown): MutableContainer {
  const c = {
    controller: initialController,
    listeners: [] as Array<() => void>,
    addEventListener(_type: 'controllerchange', listener: () => void): void {
      c.listeners.push(listener);
    },
    removeEventListener(_type: string, listener: () => void): void {
      c.listeners = c.listeners.filter((l) => l !== listener);
    },
    fire(): void {
      for (const l of [...c.listeners]) l();
    },
  };
  return c as MutableContainer;
}

describe('installUpdateReload · SW 更新即刷新（V4.12-C）', () => {
  it('① 受控页 controllerchange → reload 恰一次；二次事件不重复刷', () => {
    const container = makeContainer({ state: 'old-sw' }); // 装时已被旧 SW 控制
    const reload = vi.fn();
    installUpdateReload({ container, reload });

    container.fire(); // 新 SW skipWaiting+clientsClaim 接管
    expect(reload).toHaveBeenCalledTimes(1);

    container.fire(); // 同页生命周期内第二次事件（防御）
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('② 首装页（controller=null → 有）不刷——防循环', () => {
    const container = makeContainer(null); // 页面加载时尚未被控制
    const reload = vi.fn();
    installUpdateReload({ container, reload });

    container.fire(); // 首个 SW claim 接管
    expect(reload).not.toHaveBeenCalled();
  });

  it('③ 无 SW 环境（container undefined）安全空操作，不抛错', () => {
    const reload = vi.fn();
    expect(() => installUpdateReload({ reload })).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
  });

  it('卸载函数摘除监听（dispose 后事件不再触发 reload）', () => {
    const container = makeContainer({ state: 'old-sw' });
    const reload = vi.fn();
    const dispose = installUpdateReload({ container, reload });
    dispose();
    container.fire();
    expect(reload).not.toHaveBeenCalled();
  });
});
