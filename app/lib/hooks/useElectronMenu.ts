import { useEffect, useRef } from 'react';

export const MENU_COMMANDS = [
  'menu:new-chat',
  'menu:open-chat',
  'menu:export-chat',
  'menu:open-settings',
  'menu:find',
  'menu:toggle-sidebar',
  'menu:toggle-workbench',
  'menu:toggle-terminal',
  'menu:show-license',
] as const;

export type MenuCommand = (typeof MENU_COMMANDS)[number];

export type MenuCommandHandlers = Partial<Record<MenuCommand, () => void>>;

declare global {
  interface Window {
    electron?: {
      platform: NodeJS.Platform;
      nodeVersion: string;
      isPackaged: boolean;
      subscribe: (channel: string, handler: (...args: unknown[]) => void) => () => void;
    };
  }
}

export function useElectronMenu(handlers: MenuCommandHandlers) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    const electronApi = typeof window !== 'undefined' ? window.electron : undefined;

    if (!electronApi || typeof electronApi.subscribe !== 'function') {
      return undefined;
    }

    const unsubscribers = MENU_COMMANDS.map((channel) =>
      electronApi.subscribe(channel, () => {
        const handler = handlersRef.current[channel];
        if (handler) {
          handler();
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => {
        unsub();
      });
    };
  }, []);
}
