'use client';

import { useEffect, useState } from 'react';
import { Share, Plus, X, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PWAInstallPromptIOS() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone: boolean }).standalone === true;

    if (isStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Detect iOS Safari
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !((window as unknown as { MSStream: unknown }).MSStream);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOS && isSafari) {
      const dismissed = sessionStorage.getItem('pwa-ios-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-ios-prompt-dismissed', 'true');
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500 rounded-t-3xl border-t border-blue-500/20 bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 p-6 pb-8">
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20">
            <Smartphone className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <h3 className="mb-2 text-center text-lg font-semibold text-white">
          安装智能考勤系统
        </h3>
        <p className="mb-6 text-center text-sm text-slate-400">
          添加到主屏幕，像原生应用一样使用
        </p>

        <div className="space-y-4 rounded-xl bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-sm font-bold text-blue-300">
              1
            </div>
            <p className="text-sm text-slate-300">
              点击底部工具栏的
              <Share className="mx-1 inline h-4 w-4 text-blue-400" />
              分享按钮
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-sm font-bold text-blue-300">
              2
            </div>
            <p className="text-sm text-slate-300">
              在弹出菜单中选择
              <Plus className="mx-1 inline h-4 w-4 text-blue-400" />
              「添加到主屏幕」
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/30 text-sm font-bold text-blue-300">
              3
            </div>
            <p className="text-sm text-slate-300">
              点击「添加」即可完成安装
            </p>
          </div>
        </div>

        <Button
          onClick={handleDismiss}
          className="mt-4 w-full bg-blue-600 text-white hover:bg-blue-700"
        >
          我知道了
        </Button>
      </div>
    </div>
  );
}
