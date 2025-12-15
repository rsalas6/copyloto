#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const electronPath = require.resolve('electron');
const appPath = path.join(__dirname, '..');

// Get the actual electron executable
const electron = require('electron');

const child = spawn(electron, [appPath], {
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', (code) => {
  process.exit(code);
});
