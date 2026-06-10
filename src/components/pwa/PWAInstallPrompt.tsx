'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showManualGuide, setShowManualGuide] = useState(false);

  useEffect(() => {
    // 检查是否已安装
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      console.log('[PWA] Already running as standalone app');
      return;
    }

    console.log('[PWA] Not installed, waiting for beforeinstallprompt...');

    // 注册 Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered:', registration.scope);
          registration.update().catch(() => {});
        })
        .catch((error) => {
          console.log('[PWA] Service Worker registration failed:', error);
        });
    }

    // 监听 beforeinstallprompt 事件
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      console.log('[PWA] beforeinstallprompt captured!');

      const dismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 1500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 监听安装完成
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.removeItem('pwa-prompt-dismissed');
      console.log('[PWA] App installed successfully!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 3秒后如果还没有触发 beforeinstallprompt，显示手动安装引导
    const manualTimer = setTimeout(() => {
      if (!deferredPrompt && !isStandalone) {
        console.log('[PWA] beforeinstallprompt not fired, showing manual guide');
        setShowManualGuide(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(manualTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
    } catch (error) {
      console.error('[PWA] Install error:', error);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setShowManualGuide(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  }, []);

  // 已安装不渲染
  if (isInstalled) return null;

  // 自动弹出安装提示（浏览器支持 beforeinstallprompt）
  if (showPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-4 md:w-96">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-4 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600/20">
              <Smartphone className="h-6 w-6 text-blue-400" />
            </div>

            <div className="flex-1 pr-6">
              <h3 className="text-sm font-semibold text-white">安装智能考勤</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                添加到桌面，像原生应用一样使用，支持离线访问。
              </p>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="flex-1 text-xs text-slate-400 hover:text-white"
            >
              暂不安装
            </Button>
            <Button
              onClick={handleInstall}
              size="sm"
              className="flex-1 gap-1.5 bg-blue-600 text-xs text-white hover:bg-blue-700"
            >
              <Download className="h-3.5 w-3.5" />
              立即安装
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 浮动安装按钮（浏览器支持 beforeinstallprompt）
  if (deferredPrompt && !showPrompt) {
    return (
      <button
        onClick={() => setShowPrompt(true)}
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-blue-700 active:scale-95"
        title="安装智能考勤应用"
      >
        <Download className="h-5 w-5" />
      </button>
    );
  }

  // 手动安装引导（浏览器不支持 beforeinstallprompt 或已安装过未卸载干净）
  if (showManualGuide && !deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-500 md:left-auto md:right-4 md:w-96">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-4 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600/20">
              <Monitor className="h-6 w-6 text-emerald-400" />
            </div>

            <div className="flex-1 pr-6">
              <h3 className="text-sm font-semibold text-white">安装智能考勤到桌面</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                点击浏览器地址栏右侧的 <strong className="text-white">安装图标</strong> 或菜单中的 <strong className="text-white">安装应用</strong>
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-white/5 p-3">
            <p className="text-xs font-medium text-emerald-400">安装步骤：</p>
            <ol className="mt-1.5 space-y-1 text-xs text-slate-400">
              <li>1. 点击浏览器右上角 <strong className="text-white">⋮</strong> 菜单</li>
              <li>2. 选择 <strong className="text-white">安装应用</strong> 或 <strong className="text-white">更多工具 → 创建快捷方式</strong></li>
              <li>3. 勾选 <strong className="text-white">在窗口中打开</strong> → 点击创建</li>
            </ol>
          </div>

          <Button
            onClick={handleDismiss}
            size="sm"
            variant="ghost"
            className="mt-3 w-full text-xs text-slate-400 hover:text-white"
          >
            我知道了
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
