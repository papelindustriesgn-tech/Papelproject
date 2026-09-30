/**
 * Icônes du site (SVG inline, aucune requête réseau).
 * - Icônes « trait » : 24×24, trait fin vert, animées au défilement
 *   (chaque tracé reçoit pathLength="1" pour l'effet de dessin progressif).
 * - Icônes « pleines » : logos de réseaux sociaux et WhatsApp.
 */

const LINE = {
  // Valeurs
  quality: '<circle cx="12" cy="9" r="6"/><path d="M9.2 9.1l2 2 3.6-3.8"/><path d="M8.5 14.2L7 21l5-2.6 5 2.6-1.5-6.8"/>',
  access: '<path d="M3 13.5h3.2l3.6 2.3h3.6a1.4 1.4 0 010 2.8H10"/><path d="M13.6 18.6l5.4-2.6a1.5 1.5 0 011.6 2.4L15.4 22H8.5L6.2 20.6H3"/><circle cx="14" cy="7" r="3.8"/><path d="M14 5.5v3"/>',
  constancy: '<path d="M4 12a8 8 0 0113.7-5.6L20 8.7"/><path d="M20 3.8v4.9h-4.9"/><path d="M20 12a8 8 0 01-13.7 5.6L4 15.3"/><path d="M4 20.2v-4.9h4.9"/>',
  // Produits
  leaf: '<path d="M5 19c0-8 5.5-14 15-14 0 9.5-6 15-14 15"/><path d="M5 19c3.5-4.5 6.5-7 10-9"/>',
  layers: '<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12l9 4.5 9-4.5"/><path d="M3 16.5L12 21l9-4.5"/>',
  feather: '<path d="M20 4C12 4 6 9 6 17v3"/><path d="M20 4c0 8-5 13-12 13"/><path d="M10 13h6"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z"/><path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
  roll: '<ellipse cx="8" cy="12" rx="4" ry="7"/><path d="M8 5h9c2.2 0 4 3.1 4 7s-1.8 7-4 7H8"/><ellipse cx="8" cy="12" rx="1.3" ry="2.3"/>',
  towel: '<rect x="4" y="3" width="16" height="7" rx="3.5"/><path d="M5 10v9.5a1.5 1.5 0 001.5 1.5h11a1.5 1.5 0 001.5-1.5V10"/><path d="M9 14h6"/>',
  pocket: '<rect x="4" y="7" width="16" height="11" rx="2.5"/><path d="M9 7.5c0 2 1.3 3 3 3s3-1 3-3"/><path d="M9.5 4.5c1.5-1 3.5-1 5 0"/>',
  // Ambitions
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0112 7.3 4.3 4.3 0 0119.5 10c0 5.6-7.5 10-7.5 10z"/>',
  home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5.5h4V20"/>',
  // Distributeurs
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/><path d="M9 14.8l2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>',
  box: '<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5"/><path d="M12 12v9"/><path d="M7.8 5.2l8.5 4.6"/>',
  megaphone: '<path d="M4 10v4a1.5 1.5 0 001.5 1.5H7L17 20V4L7 8.5H5.5A1.5 1.5 0 004 10z"/><path d="M8 15.5l1.3 4.5"/><path d="M20 10v4"/>',
  percent: '<path d="M18.5 5.5l-13 13"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  // Contact / interface
  phone: '<path d="M5 3.5h3.3l1.7 4.3-2.2 1.4a11 11 0 007 7l1.4-2.2 4.3 1.7V19a1.5 1.5 0 01-1.5 1.5A16.5 16.5 0 013.5 5 1.5 1.5 0 015 3.5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  map: '<path d="M9 4L3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5z"/>'
};

const FILLED = {
  whatsapp: '<path d="M12 2.2A9.8 9.8 0 003.6 17l-1.4 5 5.1-1.3A9.8 9.8 0 1012 2.2zm0 17.9a8.1 8.1 0 01-4.1-1.1l-.3-.2-3 .8.8-3-.2-.3A8.1 8.1 0 1112 20.1zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 00-.7.3 2.8 2.8 0 00-.9 2.1 4.9 4.9 0 001 2.6 11.2 11.2 0 004.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 001.7-1.2 2.1 2.1 0 00.1-1.2c0-.2-.2-.2-.4-.3z"/>',
  facebook: '<path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4a21 21 0 00-2.3-.1c-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z"/>',
  instagram: '<path d="M12 7.2A4.8 4.8 0 1016.8 12 4.8 4.8 0 0012 7.2zm0 7.9a3.1 3.1 0 113.1-3.1 3.1 3.1 0 01-3.1 3.1zm5-9.2a1.1 1.1 0 101.1 1.1A1.1 1.1 0 0017 5.9zM21 7.3a5.5 5.5 0 00-1.5-3.8A5.5 5.5 0 0015.7 2H8.3a5.5 5.5 0 00-3.8 1.5A5.5 5.5 0 003 7.3v9.4a5.5 5.5 0 001.5 3.8A5.5 5.5 0 008.3 22h7.4a5.5 5.5 0 003.8-1.5 5.5 5.5 0 001.5-3.8zm-1.8 9.4a3.6 3.6 0 01-1 2.6 3.6 3.6 0 01-2.6 1H8.4a3.6 3.6 0 01-2.6-1 3.6 3.6 0 01-1-2.6V7.3a3.6 3.6 0 011-2.6 3.6 3.6 0 012.6-1h7.2a3.6 3.6 0 012.6 1 3.6 3.6 0 011 2.6z"/>',
  tiktok: '<path d="M16.6 2h-3.2v13.3a2.9 2.9 0 11-2-2.8V9.2a6.1 6.1 0 105.2 6.1V8.6a7.6 7.6 0 004.4 1.4V6.8A4.4 4.4 0 0116.6 2z"/>',
  linkedin: '<path d="M6.9 8.9H3.5V20.5h3.4zM5.2 3.5a2 2 0 102 2 2 2 0 00-2-2zM20.5 13.4c0-3.1-1.7-4.8-4.1-4.8a3.6 3.6 0 00-3.2 1.8V8.9H9.9v11.6h3.3v-5.8c0-1.5.3-3 2.2-3s1.8 1.8 1.8 3.1v5.7h3.3z"/>'
};

/** Icône au trait. `draw` = animée au défilement. */
export function icon(name, { cls = '', draw = false, size = 24 } = {}) {
  const body = LINE[name];
  if (!body) throw new Error(`Icône inconnue : ${name}`);
  const shapes = body.replace(/<(path|circle|ellipse|rect)\b/g, '<$1 pathLength="1"');
  return `<svg class="ico${draw ? ' ico-draw' : ''}${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes}</svg>`;
}

/** Icône pleine (réseaux sociaux, WhatsApp). */
export function glyph(name, { cls = '', size = 24 } = {}) {
  const body = FILLED[name];
  if (!body) throw new Error(`Glyphe inconnu : ${name}`);
  return `<svg class="glyph${cls ? ' ' + cls : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Logo Papel provisoire : mot-symbole « papel » + oiseau-feuille.
 * [À REMPLACER par le fichier officiel] : déposer le SVG du logo dans
 * src/assets/img/logo.svg et remplacer le contenu de cette fonction par
 * son code <svg> (garder class et aria-label).
 */
export function logo({ cls = '', label = 'Papel' } = {}) {
  return `<svg class="logo${cls ? ' ' + cls : ''}" viewBox="0 0 92 40" role="img" aria-label="${label}"><text x="0" y="26" textLength="78" lengthAdjust="spacingAndGlyphs" font-family="Poppins, Arial, sans-serif" font-weight="600" font-size="30" fill="currentColor">papel</text><path d="M60 31.2c3.4-.2 6.3 1.2 8 3.8 1.7-2.6 4.6-4 8-3.8-3 .9-5.4 2.8-6.8 5.6h-2.4c-1.4-2.8-3.8-4.7-6.8-5.6z" fill="currentColor"/><text x="82" y="10" font-family="Arial, sans-serif" font-size="7" fill="currentColor">®</text></svg>`;
}
