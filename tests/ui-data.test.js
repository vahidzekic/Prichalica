import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, translate } from '../src/i18n.js';
import { AVATARS, avatarSvg } from '../src/avatars.js';
import { VOICES } from '../src/audio/effects.js';

test('Serbian is the default language', () => {
  assert.equal(DEFAULT_LANGUAGE, 'sr');
});

test('every language has exactly the same keys', () => {
  const reference = Object.keys(STRINGS[DEFAULT_LANGUAGE]).sort();
  for (const lang of Object.keys(LANGUAGES)) {
    assert.deepEqual(Object.keys(STRINGS[lang]).sort(), reference, `${lang} keys differ`);
  }
});

test('every voice and character has a translated name', () => {
  for (const lang of Object.keys(LANGUAGES)) {
    for (const id of Object.keys(VOICES)) assert.ok(STRINGS[lang][`voice.${id}`], `${lang}: voice.${id}`);
    for (const id of Object.keys(AVATARS)) assert.ok(STRINGS[lang][`character.${id}`], `${lang}: character.${id}`);
  }
});

test('translate fills placeholders and falls back sensibly', () => {
  assert.equal(translate('en', 'error.start', { message: 'boom' }), 'Could not start: boom');
  assert.equal(translate('sr', 'error.start', { message: 'bum' }), 'Ne mogu da počnem: bum');
  assert.equal(translate('xx', 'button.start'), 'Kreni');
  assert.equal(translate('en', 'no.such.key'), 'no.such.key');
});

test('every avatar can blink and talk', () => {
  for (const [id, body] of Object.entries(AVATARS)) {
    assert.equal(body.match(/class="eye"/g)?.length, 2, `${id} needs two .eye parts`);
    assert.match(body, /class="mouth-open"/, `${id} needs a .mouth-open part`);
  }
  assert.match(avatarSvg('nope'), /^<svg[^>]+viewBox="0 0 200 200"/);
});
