#!/usr/bin/env node
// Seal a flag for dist/games.js: AES-GCM, key from the bunny password via PBKDF2.
// Usage: node scripts/seal-flag.mjs '<password>' '<flag text>'
// Paste the printed blob into `flagBlob` in dist/games.js. The password never ships;
// only this ciphertext does, so viewing source no longer reveals the flag.
const [password, flag] = process.argv.slice(2);
if (!password || !flag) {
  console.error("Usage: node scripts/seal-flag.mjs '<password>' '<flag text>'");
  process.exit(1);
}
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  {name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256'}, keyMaterial,
  {name: 'AES-GCM', length: 256}, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, new TextEncoder().encode(flag)));
const blob = Buffer.concat([Buffer.from(salt), Buffer.from(iv), Buffer.from(ct)]).toString('base64');
console.log(blob);
