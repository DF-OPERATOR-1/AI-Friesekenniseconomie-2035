import { spawn } from 'node:child_process';
import { relative, sep } from 'node:path';
import type { Plugin } from 'vite';

/** Gegenereerde bestanden mogen nooit opnieuw een build starten. */
export function isDocsSource(root: string, file: string) {
  const name = relative(root, file).split(sep).join('/');
  return (
    name.startsWith('src/') ||
    (name.startsWith('public/') && !name.startsWith('public/data/')) ||
    ['index.html', 'package.json', 'package-lock.json', 'vite.config.ts'].includes(name)
  );
}

/** Wacht op een korte schrijfpauze en voer nooit twee builds tegelijk uit. */
export function createDocsBuildQueue(runBuild: () => Promise<void>, delay = 800) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let dirty = false;
  let stopped = false;
  const flush = async () => {
    timer = undefined;
    if (stopped || running || !dirty) return;
    dirty = false;
    running = true;
    try {
      await runBuild();
    } finally {
      running = false;
      if (dirty && !stopped) timer = setTimeout(flush, delay);
    }
  };
  return {
    schedule() {
      if (stopped) return;
      dirty = true;
      if (timer) clearTimeout(timer);
      if (!running) timer = setTimeout(flush, delay);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

export function devDocsSync(): Plugin {
  return {
    name: 'docs-bijwerken-tijdens-ontwikkeling',
    apply: 'serve',
    configureServer(server) {
      // De productiebuild gebruikt deze plug-in niet: zo ontstaat geen bouwlus.
      let child: ReturnType<typeof spawn> | undefined;
      let closing = false;
      const queue = createDocsBuildQueue(
        () =>
          new Promise<void>((resolve) => {
            server.config.logger.info(
              '[docs] Website wordt gebouwd en naar docs/ bijgewerkt…',
            );
            child = spawn(
              process.platform === 'win32' ? 'npm.cmd' : 'npm',
              ['run', 'build:pages'],
              {
                cwd: server.config.root,
                env: { ...process.env, NODE_ENV: 'production' },
                shell: process.platform === 'win32',
                detached: process.platform !== 'win32',
                stdio: ['ignore', 'pipe', 'pipe'],
              },
            );
            let output = '';
            child.stdout?.on('data', (chunk) => {
              output += chunk;
            });
            child.stderr?.on('data', (chunk) => {
              output += chunk;
            });
            let finished = false;
            const finish = (success: boolean) => {
              if (finished) return;
              finished = true;
              child = undefined;
              if (closing) {
                resolve();
                return;
              }
              if (success)
                server.config.logger.info(
                  '[docs] Bijgewerkt. Deze bestanden kunnen mee in je commit.',
                );
              else
                server.config.logger.error(
                  '[docs] Bijwerken mislukt; de laatste geslaagde versie blijft staan.\n' +
                    output,
                );
              resolve();
            };
            child.once('error', (error) => {
              output += error.message;
              finish(false);
            });
            child.once('exit', (code) => finish(code === 0));
          }),
      );
      const onChange = (_event: string, file: string) => {
        if (isDocsSource(server.config.root, file)) queue.schedule();
      };
      server.watcher.on('all', onChange);
      server.httpServer?.once('listening', () => queue.schedule());
      server.httpServer?.once('close', () => {
        closing = true;
        queue.stop();
        server.watcher.off('all', onChange);
        if (child?.pid) {
          try {
            if (process.platform === 'win32') child.kill();
            else process.kill(-child.pid, 'SIGTERM');
          } catch {
            /* Het bouwproces kan intussen al zijn gestopt. */
          }
        }
      });
    },
  };
}
