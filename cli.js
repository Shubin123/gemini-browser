// #!/usr/bin/env node
// // this script is for npm release and developing with source. it is not packaged with binary
// import { spawn } from 'child_process';
// import path from 'path';
// import { fileURLToPath } from 'url';
import { setupPlaywrightIPC } from './playwr.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to local electron binary
// const electronBinary = process.platform === 'win32'
//   ? path.join(__dirname, 'node_modules', '.bin', 'electron.cmd') // Windows uses .cmd wrappers
//   : path.join(__dirname, 'node_modules', '.bin', 'electron');

const child = spawn("electron", ['main.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true, // Necessary for .cmd resolution on Windows
});

child.on('exit', (code) => process.exit(code));

// // if launching through playwright
// let playwrightBridge = setupPlaywrightIPC(null, null, null);
// playwrightBridge.launchElectronPlaywright()
