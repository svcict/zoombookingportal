import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setEntryPoint('src/index.ts');

// This container has no network egress to remotion.media (where Remotion
// would otherwise download its own chrome-headless-shell), so point it at
// the Playwright-bundled headless shell that's already on disk.
const bundledHeadlessShell = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
if (require('node:fs').existsSync(bundledHeadlessShell)) {
  Config.setBrowserExecutable(bundledHeadlessShell);
}
