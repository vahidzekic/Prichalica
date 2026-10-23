/**
 * Interface translations. Serbian (ekavian, Latin script) is the default.
 *
 * To add a language: copy the `en` block, translate every value, add the code
 * to LANGUAGES, and run `npm test` (it checks that no key is missing).
 * In the HTML, `data-i18n="key"` sets an element's text and
 * `data-i18n-aria-label="key"` sets its aria-label.
 */

export const LANGUAGES = Object.freeze({ sr: 'Srpski', en: 'English' });
export const DEFAULT_LANGUAGE = 'sr';

export const STRINGS = Object.freeze({
  sr: {
    'app.title': 'Pričalica',
    'app.tagline': 'Reci nešto, pa zastani. Ja ću to odmah da ponovim!',
    'app.description': 'Pričalica: pričaj joj i ona ponavlja tvoje reči smešnim glasom, kao igračka koja priča. Radi u potpunosti u pregledaču.',
    'language': 'Jezik',

    'status.idle': 'Pritisni „Kreni“ i dozvoli mikrofon.',
    'status.calibrating': 'Pst… merim koliko je tiho u sobi.',
    'status.listening': 'Slušam te. Reci nešto!',
    'status.recording': 'Uuu, pričaj dalje…',
    'status.processing': 'Hmm…',
    'status.speaking': 'Evo, ponavljam!',

    'button.start': 'Kreni',
    'button.stop': 'Stani',

    'voice.label': 'Glas',
    'voice.toy': 'Igračka',
    'voice.child': 'Dečji',
    'voice.female': 'Ženski',
    'voice.male': 'Muški',
    'voice.robot': 'Robot',

    'character.label': 'Lik',
    'character.hamster': 'Hrčak',
    'character.parrot': 'Papagaj',
    'character.cat': 'Mačka',
    'character.frog': 'Žaba',
    'character.robot': 'Robot',

    'settings.title': 'Podešavanja',
    'settings.pitch': 'Fino podešavanje visine',
    'settings.sensitivity': 'Prag osetljivosti',
    'settings.sensitivityHint': 'Koliko glasnije od sobe treba da pričaš. Manje znači osetljivije.',

    'footer.privacy': 'Tvoj glas nikada ne napušta ovaj uređaj. Sav zvuk se obrađuje lokalno, u pregledaču.',
    'footer.license': 'Otvoreni kod pod MIT licencom.',

    'error.blocked': 'Pristup mikrofonu je blokiran. Dozvoli ga u adresnoj traci i pokušaj ponovo.',
    'error.notFound': 'Mikrofon nije pronađen. Priključi ga i pokušaj ponovo.',
    'error.busy': 'Mikrofon trenutno koristi druga aplikacija.',
    'error.unsupported': 'Ovaj pregledač ne može da pristupi mikrofonu (potrebna je https:// ili localhost stranica).',
    'error.start': 'Ne mogu da počnem: {message}',
    'error.runtime': 'Nešto nije u redu: {message}',
  },

  en: {
    'app.title': 'Prichalica',
    'app.tagline': "Say something, then pause. I'll say it right back!",
    'app.description': 'Prichalica (Chatterbox): talk to it and it repeats what you said in a funny voice, like a talking toy. Runs entirely in your browser.',
    'language': 'Language',

    'status.idle': 'Press Start and allow the microphone.',
    'status.calibrating': 'Shh… measuring how quiet the room is.',
    'status.listening': "I'm listening. Say something!",
    'status.recording': 'Ooh, go on…',
    'status.processing': 'Hmm…',
    'status.speaking': 'Here I go!',

    'button.start': 'Start',
    'button.stop': 'Stop',

    'voice.label': 'Voice',
    'voice.toy': 'Toy',
    'voice.child': 'Child',
    'voice.female': 'Female',
    'voice.male': 'Male',
    'voice.robot': 'Robot',

    'character.label': 'Character',
    'character.hamster': 'Hamster',
    'character.parrot': 'Parrot',
    'character.cat': 'Cat',
    'character.frog': 'Frog',
    'character.robot': 'Robot',

    'settings.title': 'Settings',
    'settings.pitch': 'Pitch fine-tune',
    'settings.sensitivity': 'Trigger level',
    'settings.sensitivityHint': 'How much louder than the room you need to be. Lower is more sensitive.',

    'footer.privacy': 'Your voice never leaves this device. All audio is processed locally in the browser.',
    'footer.license': 'Open source under the MIT License.',

    'error.blocked': 'Microphone access was blocked. Allow it in the address bar and try again.',
    'error.notFound': 'No microphone was found. Plug one in and try again.',
    'error.busy': 'The microphone is busy in another app.',
    'error.unsupported': 'This browser cannot access the microphone (a secure https:// or localhost page is required).',
    'error.start': 'Could not start: {message}',
    'error.runtime': 'Something went wrong: {message}',
  },
});

/**
 * Looks up a string, filling `{placeholders}` from `params`.
 * Falls back to the default language, then to the key itself.
 */
export function translate(lang, key, params = {}) {
  const text = STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANGUAGE][key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
}

/** Translates every `data-i18n` / `data-i18n-aria-label` element under `root`. */
export function applyTranslations(root, lang) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    el.textContent = translate(lang, el.dataset.i18n);
  }
  for (const el of root.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', translate(lang, el.dataset.i18nAriaLabel));
  }
}
