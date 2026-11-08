// Fails (exit 1) if the mobile and backend copies of the severity classifier
// have drifted apart. The two files must be identical once export syntax and
// the header comment are removed.
//
//   node backend/scripts/check-shared-sync.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const mobileFile = path.join(root, 'mobile', 'src', 'utils', 'severityClassifier.js');
const backendFile = path.join(root, 'backend', 'utils', 'severityClassifier.js');

const normalise = (src) =>
  src
    .replace(/\r\n/g, '\n')
    // drop leading comment block (headers differ)
    .replace(/^(\/\/[^\n]*\n|\s*\n)+/, '')
    // ESM -> plain
    .replace(/^export const /gm, 'const ')
    // CJS export line
    .replace(/^module\.exports\s*=\s*\{[^}]*\};?\s*$/gm, '')
    .trim();

const a = normalise(fs.readFileSync(mobileFile, 'utf8'));
const b = normalise(fs.readFileSync(backendFile, 'utf8'));

if (a !== b) {
  console.error('Shared classifier mismatch between:');
  console.error(`  ${mobileFile}`);
  console.error(`  ${backendFile}`);
  const la = a.split('\n');
  const lb = b.split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++) {
    if (la[i] !== lb[i]) {
      console.error(`First difference at line ${i + 1}:`);
      console.error(`  mobile : ${la[i]}`);
      console.error(`  backend: ${lb[i]}`);
      break;
    }
  }
  process.exit(1);
}
console.log('Shared classifier in sync.');
