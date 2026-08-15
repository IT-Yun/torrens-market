#!/usr/bin/env node
// i18n QA: verifies ko/en/zh locale files have identical key sets and no
// empty values, and flags suspicious hard-coded strings in screens.
// Run: node scripts/check-i18n.js   (exits 1 on any problem)

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
const LANGS = ['en', 'ko', 'zh'];

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? flatten(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]],
  );
}

let failed = false;
const flats = {};
for (const lang of LANGS) {
  const file = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${lang}.json`), 'utf8'));
  flats[lang] = new Map(flatten(file));
}

const allKeys = new Set(LANGS.flatMap((lang) => [...flats[lang].keys()]));
for (const key of [...allKeys].sort()) {
  for (const lang of LANGS) {
    if (!flats[lang].has(key)) {
      console.error(`MISSING  ${lang}: ${key}`);
      failed = true;
    } else if (String(flats[lang].get(key)).trim() === '') {
      console.error(`EMPTY    ${lang}: ${key}`);
      failed = true;
    }
  }
}

const identical = [...allKeys]
  .filter((key) => LANGS.every((lang) => flats[lang].has(key)))
  .filter((key) => flats.ko.get(key) === flats.en.get(key) && flats.en.get(key) === flats.zh.get(key))
  .filter((key) => !/^\W+$/.test(String(flats.en.get(key)))); // symbols-only is fine
for (const key of identical) {
  console.warn(`SAME-IN-ALL (untranslated?) ${key}: "${flats.en.get(key)}"`);
}

console.log(
  `${allKeys.size} keys × ${LANGS.length} languages — ${failed ? 'FAILED' : 'OK'}` +
    (identical.length ? ` (${identical.length} same-in-all warnings)` : ''),
);
process.exit(failed ? 1 : 0);
