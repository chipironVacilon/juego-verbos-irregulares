#!/usr/bin/env node
/*
 * Sanity check for the verb dataset. Run it after editing verbs.js:
 *
 *   node scripts/check-data.mjs
 *
 * It fails loudly (exit code 1) when a verb is incomplete, when a sentence does
 * not contain the word the game will blank out, or when a blanked word is not a
 * real form of that verb.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const VERBS = require(join(here, "..", "verbs.js"));

const problems = [];
const fail = (verb, message) => problems.push(`${verb}: ${message}`);

const variants = (value) => value.split("/").map((part) => part.trim().toLowerCase());
const countWord = (sentence, word) =>
  sentence.toLowerCase().split(/[^a-z']+/).filter((token) => token === word.toLowerCase()).length;

const seenBases = new Set();
const seenSentences = new Set();

if (!Array.isArray(VERBS) || VERBS.length < 10) {
  console.error(`Dataset too small or not an array: ${VERBS?.length}`);
  process.exit(1);
}

for (const [index, verb] of VERBS.entries()) {
  const label = verb?.base || `#${index}`;

  for (const field of ["base", "past", "participle", "es"]) {
    if (typeof verb?.[field] !== "string" || !verb[field].trim()) fail(label, `missing "${field}"`);
  }
  if (!Array.isArray(verb?.examples) || verb.examples.length !== 2) {
    fail(label, "needs exactly two example sentences");
    continue;
  }
  if (seenBases.has(verb.base)) fail(label, "duplicated base form");
  seenBases.add(verb.base);

  const forms = {
    past: variants(verb.past),
    participle: variants(verb.participle)
  };
  const trainedForms = [];

  for (const example of verb.examples) {
    const { en, es, form, target } = example || {};
    if (!["past", "participle"].includes(form)) fail(label, `example form "${form}" is not past or participle`);
    for (const field of ["en", "es", "target"]) {
      if (typeof example?.[field] !== "string" || !example[field].trim()) fail(label, `example missing "${field}"`);
    }
    if (typeof en !== "string" || typeof target !== "string") continue;

    trainedForms.push(form);
    if (!/^[A-Z¿"']/.test(en)) fail(label, `sentence should start with a capital letter: ${en}`);
    if (!/[.?!]$/.test(en)) fail(label, `sentence should end with punctuation: ${en}`);
    if (en.length > 60) fail(label, `sentence is long for 6th grade (${en.length} chars): ${en}`);
    if (es.trim() === en.trim()) fail(label, `translation repeats the English sentence: ${es}`);

    const appearances = countWord(en, target);
    if (appearances !== 1) fail(label, `"${target}" appears ${appearances} times (should be exactly 1) in: ${en}`);
    if (!forms[form]?.includes(target.toLowerCase())) {
      fail(label, `"${target}" is not a ${form} form of ${verb.base} (${verb[form]})`);
    }
    if (seenSentences.has(en)) fail(label, `duplicated sentence: ${en}`);
    seenSentences.add(en);

    if (form === "participle" && !/\b(has|have)\b/i.test(en)) {
      fail(label, `participle sentence should use has/have: ${en}`);
    }
  }

  if (!trainedForms.includes("past")) fail(label, "missing a past-simple sentence");
  if (!trainedForms.includes("participle")) fail(label, "missing a present-perfect sentence");

  // A TTS voice reads "read" as the present tense, so the game asks for "red".
  if (verb.past === "read" && !verb.speakPast) fail(label, 'needs speakPast so "read" is not read as the present');
}

const totalSentences = VERBS.reduce((sum, verb) => sum + (verb.examples?.length || 0), 0);
console.log(`Verbs: ${VERBS.length}  ·  Example sentences: ${totalSentences}`);

if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log("Dataset OK");
