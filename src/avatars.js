/**
 * Hand-drawn SVG characters (200×200 viewBox).
 *
 * Every character uses the same class names so one stylesheet can animate
 * them all (see the "Avatar parts" section of styles.css):
 *   .eye           blinks (scaled flat) and widens while recording
 *   .pupil         looks up while "thinking"
 *   .mouth-open    the open mouth; its height follows the --mouth CSS variable (0..1)
 *   .mouth-closed  the closed mouth; fades out as the mouth opens
 *   .jaw           a lower jaw/beak that drops as the mouth opens
 *   .ear           wiggles while recording (ears, crest, antenna)
 *   .cheek         blushes while speaking
 * Parts are optional: a character without a .jaw simply has none.
 */

const MOUTH_DARK = '#5b1f24';
const TONGUE = '#ec7f86';
const BLUSH = '#f49b94';

const hamster = `
  <g class="ear ear--left"><circle cx="48" cy="58" r="24" fill="#e39a5c"/><circle cx="48" cy="58" r="13" fill="#f5b8a8"/></g>
  <g class="ear ear--right"><circle cx="152" cy="58" r="24" fill="#e39a5c"/><circle cx="152" cy="58" r="13" fill="#f5b8a8"/></g>
  <ellipse cx="100" cy="112" rx="78" ry="70" fill="#f0b37a"/>
  <ellipse cx="100" cy="137" rx="54" ry="42" fill="#fff4e4"/>
  <circle class="cheek" cx="52" cy="132" r="15" fill="${BLUSH}" opacity=".55"/>
  <circle class="cheek" cx="148" cy="132" r="15" fill="${BLUSH}" opacity=".55"/>
  <g class="eye"><g class="pupil"><circle cx="72" cy="100" r="11" fill="#2a1b12"/><circle cx="68.5" cy="96" r="4" fill="#fff"/></g></g>
  <g class="eye"><g class="pupil"><circle cx="128" cy="100" r="11" fill="#2a1b12"/><circle cx="124.5" cy="96" r="4" fill="#fff"/></g></g>
  <g class="mouth-open"><ellipse cx="100" cy="142" rx="15" ry="14" fill="${MOUTH_DARK}"/><ellipse cx="100" cy="150" rx="9" ry="5" fill="${TONGUE}"/></g>
  <path d="M94 129 h12 v8 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 Z M100 129 V139" fill="#fff" stroke="#e8dccb" stroke-width="1"/>
  <path class="mouth-closed" d="M86 128 Q93 135 100 128 Q107 135 114 128" fill="none" stroke="#7a4a2e" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="100" cy="121" rx="8" ry="5.5" fill="#d9706b"/>
`;

const parrot = `
  <g class="ear ear--crest">
    <path d="M96 50 C78 32 76 16 84 10 C86 26 94 38 96 50Z" fill="#f2c14e"/>
    <path d="M104 50 C118 30 128 22 136 24 C126 34 114 42 104 50Z" fill="#f2c14e"/>
    <path d="M100 48 C88 20 96 6 108 4 C104 20 112 34 100 48Z" fill="#ef5b4c"/>
  </g>
  <ellipse cx="100" cy="112" rx="72" ry="72" fill="#3fb37f"/>
  <ellipse cx="100" cy="154" rx="50" ry="30" fill="#7fd4a6"/>
  <ellipse cx="68" cy="98" rx="22" ry="24" fill="#fff"/>
  <ellipse cx="132" cy="98" rx="22" ry="24" fill="#fff"/>
  <circle class="cheek" cx="56" cy="130" r="11" fill="${BLUSH}" opacity=".5"/>
  <circle class="cheek" cx="144" cy="130" r="11" fill="${BLUSH}" opacity=".5"/>
  <g class="eye"><g class="pupil"><circle cx="70" cy="100" r="10" fill="#1f2a30"/><circle cx="67" cy="96" r="3.5" fill="#fff"/></g></g>
  <g class="eye"><g class="pupil"><circle cx="130" cy="100" r="10" fill="#1f2a30"/><circle cx="127" cy="96" r="3.5" fill="#fff"/></g></g>
  <g class="mouth-open"><ellipse cx="100" cy="140" rx="12" ry="12" fill="${MOUTH_DARK}"/><ellipse cx="100" cy="147" rx="7" ry="4" fill="${TONGUE}"/></g>
  <path class="jaw" d="M86 128 Q100 156 114 128Z" fill="#d98a1f"/>
  <path d="M78 110 Q100 88 122 110 Q120 128 100 136 Q80 128 78 110Z" fill="#f6a623"/>
`;

const cat = `
  <g class="ear ear--left"><path d="M34 92 L46 22 L92 52Z" fill="#f2a65a"/><path d="M46 78 L52 38 L80 56Z" fill="#f7b9b0"/></g>
  <g class="ear ear--right"><path d="M166 92 L154 22 L108 52Z" fill="#f2a65a"/><path d="M154 78 L148 38 L120 56Z" fill="#f7b9b0"/></g>
  <ellipse cx="100" cy="115" rx="76" ry="64" fill="#f2a65a"/>
  <path d="M100 54 V72 M86 56 L90 70 M114 56 L110 70" stroke="#d9823a" stroke-width="5" stroke-linecap="round"/>
  <ellipse cx="86" cy="139" rx="19" ry="15" fill="#fff4e4"/>
  <ellipse cx="114" cy="139" rx="19" ry="15" fill="#fff4e4"/>
  <circle class="cheek" cx="50" cy="128" r="12" fill="${BLUSH}" opacity=".5"/>
  <circle class="cheek" cx="150" cy="128" r="12" fill="${BLUSH}" opacity=".5"/>
  <g class="eye"><ellipse cx="70" cy="104" rx="13" ry="14" fill="#8fd16f"/><g class="pupil"><ellipse cx="70" cy="105" rx="5" ry="10" fill="#1d1d1d"/><circle cx="66" cy="99" r="3" fill="#fff"/></g></g>
  <g class="eye"><ellipse cx="130" cy="104" rx="13" ry="14" fill="#8fd16f"/><g class="pupil"><ellipse cx="130" cy="105" rx="5" ry="10" fill="#1d1d1d"/><circle cx="126" cy="99" r="3" fill="#fff"/></g></g>
  <path d="M60 134 L24 128 M60 142 L26 147 M140 134 L176 128 M140 142 L174 147" stroke="#7a4a2e" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
  <g class="mouth-open"><ellipse cx="100" cy="148" rx="13" ry="12" fill="${MOUTH_DARK}"/><ellipse cx="100" cy="155" rx="8" ry="4.5" fill="${TONGUE}"/></g>
  <path class="mouth-closed" d="M100 134 V140 M88 140 Q94 147 100 140 Q106 147 112 140" fill="none" stroke="#7a4a2e" stroke-width="3" stroke-linecap="round"/>
  <path d="M93 127 L107 127 L100 135Z" fill="#e8737a" stroke="#e8737a" stroke-width="2" stroke-linejoin="round"/>
`;

const frog = `
  <circle cx="64" cy="70" r="30" fill="#6cc24a"/>
  <circle cx="136" cy="70" r="30" fill="#6cc24a"/>
  <ellipse cx="100" cy="125" rx="84" ry="58" fill="#6cc24a"/>
  <ellipse cx="100" cy="154" rx="56" ry="26" fill="#a6e07f"/>
  <circle class="cheek" cx="42" cy="134" r="13" fill="${BLUSH}" opacity=".5"/>
  <circle class="cheek" cx="158" cy="134" r="13" fill="${BLUSH}" opacity=".5"/>
  <g class="eye"><circle cx="64" cy="68" r="20" fill="#fff"/><g class="pupil"><circle cx="66" cy="70" r="10" fill="#1d2a1d"/><circle cx="62" cy="65" r="3.5" fill="#fff"/></g></g>
  <g class="eye"><circle cx="136" cy="68" r="20" fill="#fff"/><g class="pupil"><circle cx="134" cy="70" r="10" fill="#1d2a1d"/><circle cx="130" cy="65" r="3.5" fill="#fff"/></g></g>
  <circle cx="92" cy="110" r="2.5" fill="#3f7f2a"/><circle cx="108" cy="110" r="2.5" fill="#3f7f2a"/>
  <g class="mouth-open"><path d="M58 128 Q100 182 142 128Z" fill="${MOUTH_DARK}"/><ellipse cx="100" cy="148" rx="17" ry="6" fill="${TONGUE}"/></g>
  <path class="mouth-closed" d="M56 128 Q100 160 144 128" fill="none" stroke="#2f6b1e" stroke-width="4" stroke-linecap="round"/>
`;

const robot = `
  <g class="ear ear--antenna"><path d="M100 50 V24" stroke="#7d8a99" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="18" r="9" fill="#ef5b4c"/></g>
  <rect x="16" y="94" width="20" height="38" rx="7" fill="#7d8a99"/>
  <rect x="164" y="94" width="20" height="38" rx="7" fill="#7d8a99"/>
  <rect x="30" y="48" width="140" height="124" rx="28" fill="#b7c3d0"/>
  <rect x="44" y="64" width="112" height="94" rx="18" fill="#dfe7ef"/>
  <circle class="cheek" cx="58" cy="138" r="6" fill="#ef5b4c" opacity=".7"/>
  <circle class="cheek" cx="142" cy="138" r="6" fill="#ef5b4c" opacity=".7"/>
  <g class="eye"><circle cx="76" cy="98" r="15" fill="#27313d"/><g class="pupil"><circle cx="76" cy="98" r="8" fill="#4fd1ff"/><circle cx="73" cy="95" r="3" fill="#fff"/></g></g>
  <g class="eye"><circle cx="124" cy="98" r="15" fill="#27313d"/><g class="pupil"><circle cx="124" cy="98" r="8" fill="#4fd1ff"/><circle cx="121" cy="95" r="3" fill="#fff"/></g></g>
  <g class="mouth-closed"><rect x="72" y="130" width="56" height="12" rx="5" fill="#27313d"/><path d="M80 136 H120" stroke="#4fd1ff" stroke-width="3" stroke-linecap="round"/></g>
  <g class="mouth-open"><rect x="72" y="128" width="56" height="26" rx="7" fill="#27313d"/><path d="M82 134 V148 M91 134 V148 M100 134 V148 M109 134 V148 M118 134 V148" stroke="#4fd1ff" stroke-width="3" stroke-linecap="round"/></g>
`;

/** Character id -> SVG body. The i18n key for its name is `character.<id>`. */
export const AVATARS = Object.freeze({ hamster, parrot, cat, frog, robot });

export const DEFAULT_AVATAR = 'hamster';

/** Full <svg> markup for a character (decorative: hidden from screen readers). */
export function avatarSvg(id) {
  const body = AVATARS[id] ?? AVATARS[DEFAULT_AVATAR];
  return `<svg class="avatar" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">${body}</svg>`;
}
