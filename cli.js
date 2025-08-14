#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Launch electron with the main.js file
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
const mainPath = path.join(__dirname, 'main.js');

spawn(electronPath, [mainPath, ...process.argv.slice(2)], {
    cwd: __dirname,
  stdio: 'inherit'
});