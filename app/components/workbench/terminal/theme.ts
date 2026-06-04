import type { ITheme } from '@xterm/xterm';

const style = getComputedStyle(document.documentElement);
const cssVar = (token: string) => style.getPropertyValue(token) || undefined;

export function getTerminalTheme(overrides?: ITheme): ITheme {
  return {
    cursor: cssVar('--wisp-elements-terminal-cursorColor'),
    cursorAccent: cssVar('--wisp-elements-terminal-cursorColorAccent'),
    foreground: cssVar('--wisp-elements-terminal-textColor'),
    background: cssVar('--wisp-elements-terminal-backgroundColor'),
    selectionBackground: cssVar('--wisp-elements-terminal-selection-backgroundColor'),
    selectionForeground: cssVar('--wisp-elements-terminal-selection-textColor'),
    selectionInactiveBackground: cssVar('--wisp-elements-terminal-selection-backgroundColorInactive'),

    // ansi escape code colors
    black: cssVar('--wisp-elements-terminal-color-black'),
    red: cssVar('--wisp-elements-terminal-color-red'),
    green: cssVar('--wisp-elements-terminal-color-green'),
    yellow: cssVar('--wisp-elements-terminal-color-yellow'),
    blue: cssVar('--wisp-elements-terminal-color-blue'),
    magenta: cssVar('--wisp-elements-terminal-color-magenta'),
    cyan: cssVar('--wisp-elements-terminal-color-cyan'),
    white: cssVar('--wisp-elements-terminal-color-white'),
    brightBlack: cssVar('--wisp-elements-terminal-color-brightBlack'),
    brightRed: cssVar('--wisp-elements-terminal-color-brightRed'),
    brightGreen: cssVar('--wisp-elements-terminal-color-brightGreen'),
    brightYellow: cssVar('--wisp-elements-terminal-color-brightYellow'),
    brightBlue: cssVar('--wisp-elements-terminal-color-brightBlue'),
    brightMagenta: cssVar('--wisp-elements-terminal-color-brightMagenta'),
    brightCyan: cssVar('--wisp-elements-terminal-color-brightCyan'),
    brightWhite: cssVar('--wisp-elements-terminal-color-brightWhite'),

    ...overrides,
  };
}
