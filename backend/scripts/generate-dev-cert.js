// Generate a self-signed cert + key for local TLS 1.3 development.
//
// Usage:
//   node backend/scripts/generate-dev-cert.js
//
// Writes backend/certs/dev-key.pem and backend/certs/dev-cert.pem. Then add
// HTTPS_KEY_PATH=./certs/dev-key.pem and HTTPS_CERT_PATH=./certs/dev-cert.pem
// to backend/.env and restart the server.
//
// Verify TLS works:
//   curl --insecure --tlsv1.3 https://localhost:3000/api/health
// Expected response: {"tls":"enabled",...}

const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

const CERT_DIR = path.join(__dirname, '..', 'certs');
const KEY_FILE = path.join(CERT_DIR, 'dev-key.pem');
const CERT_FILE = path.join(CERT_DIR, 'dev-cert.pem');

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'Campus Safety Dev' },
];

const extensions = [
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },
      { type: 7, ip: '127.0.0.1' },
    ],
  },
];

if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

const pems = selfsigned.generate(attrs, {
  algorithm: 'sha256',
  days: 365,
  keySize: 2048,
  extensions,
});

fs.writeFileSync(KEY_FILE, pems.private);
fs.writeFileSync(CERT_FILE, pems.cert);

console.log('Dev TLS cert generated:');
console.log(`  Key:  ${KEY_FILE}`);
console.log(`  Cert: ${CERT_FILE}`);
console.log('\nAdd these lines to backend/.env then restart the server:');
console.log('  HTTPS_KEY_PATH=./certs/dev-key.pem');
console.log('  HTTPS_CERT_PATH=./certs/dev-cert.pem');
console.log('\nVerify TLS 1.3 with:');
console.log('  curl --insecure --tlsv1.3 https://localhost:3000/api/health');
