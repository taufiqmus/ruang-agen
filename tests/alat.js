/* Bekal bersama untuk semua uji: berpindah ke akar repo dan mencari alat uji browser.
   Bisa ditimpa lewat variabel lingkungan: PW (playwright-core), THREE (three.min.js r128), CHROME (Chrome atau Edge). */
const fs = require('fs'), path = require('path');
const AKAR = path.resolve(__dirname, '..');
process.chdir(AKAR);
const CHROME = [process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
].find(p => p && fs.existsSync(p));
module.exports = { AKAR, CHROME, THREE: process.env.THREE || path.join(__dirname, 'vendor', 'three.min.js'), PW: process.env.PW || 'playwright-core' };
