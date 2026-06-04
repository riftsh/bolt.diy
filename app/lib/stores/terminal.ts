import type { RuntimeProvider, SpawnedProcess } from '~/lib/runtime/runtime-provider';
import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal } from '~/types/terminal';
import { newwispShellProcess, newShellProcess } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('TerminalStore');

export class TerminalStore {
  #runtime: Promise<RuntimeProvider>;
  #terminals: Array<{ terminal: ITerminal; process: SpawnedProcess }> = [];
  #wispTerminal = newwispShellProcess();

  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  constructor(runtimePromise: Promise<RuntimeProvider>) {
    this.#runtime = runtimePromise;

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }

  get wispTerminal() {
    return this.#wispTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachwispTerminal(terminal: ITerminal) {
    try {
      const runtime = await this.#runtime;

      if (!runtime) {
        terminal.write(coloredText.red('Runtime not available\n'));

        return;
      }

      await this.#wispTerminal.init(runtime, terminal);
    } catch (error: unknown) {
      terminal.write(
        coloredText.red('Failed to spawn wisp shell\n\n') + (error instanceof Error ? error.message : String(error)),
      );

      return;
    }
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      const runtime = await this.#runtime;

      if (!runtime) {
        terminal.write(coloredText.red('Runtime not available\n'));

        return;
      }

      const shellProcess = await newShellProcess(runtime, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
    } catch (error: unknown) {
      terminal.write(
        coloredText.red('Failed to spawn shell\n\n') + (error instanceof Error ? error.message : String(error)),
      );

      return;
    }
  }

  onTerminalResize(cols: number, rows: number) {
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }

  async detachTerminal(terminal: ITerminal) {
    const terminalIndex = this.#terminals.findIndex((t) => t.terminal === terminal);

    if (terminalIndex !== -1) {
      const { process } = this.#terminals[terminalIndex];

      try {
        process.kill();
      } catch (error) {
        logger.warn('Failed to kill terminal process:', error);
      }

      this.#terminals.splice(terminalIndex, 1);
    }
  }
}
