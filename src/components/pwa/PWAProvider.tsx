'use client';

import { PWAInstallPrompt } from './PWAInstallPrompt';
import { PWAInstallPromptIOS } from './PWAInstallPromptIOS';

export function PWAProvider() {
  return (
    <>
      <PWAInstallPrompt />
      <PWAInstallPromptIOS />
    </>
  );
}
