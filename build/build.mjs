/**
 * Générateur du site Papel (aucune dépendance externe, Node 18+).
 *
 *   npm run build   → génère le site statique dans dist/
 *
 * Les TEXTES se modifient dans content/fr.json et content/en.json,
 * les RÉGLAGES (WhatsApp, e-mail, formulaires, mesure d'audience) dans
 * content/config.json, les POINTS DE VENTE dans content/points-de-vente.json.
 * Ce fichier ne contient que la mise en page.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { icon, glyph, logo } from './icons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));

const cfg = readJSON('config.json');
const content = { fr: readJSON('fr.json'), en: readJSON('en.json') };
const points = readJSON('points-de-vente.json').points || [];
const LANGS = ['fr', 'en'];
const YEAR = new Date().getFullYear();

/* ------------------------------------------------------------------ */
/* Adresses des pages (français par défaut, anglais sous /en/)          */
/* ------------------------------------------------------------------ */
const ROUTES = {
  home:        { fr: '/',                      en: '/en/' },
  products:    { fr: '/produits/',             en: '/en/products/' },
  about:       { fr: '/a-propos/',             en: '/en/about/' },
  distributor: { fr: '/devenir-distributeur/', en: '/en/become-a-distributor/' },
  where:       { fr: '/ou-acheter/',           en: '/en/where-to-buy/' },
  contact:     { fr: '/contact/',              en: '/en/contact/' },
  legal:       { fr: '/mentions-legales/',     en: '/en/legal-notice/' }
};
const url = (page, lang) => ROUTES[page][lang];
const abs = (p) => cfg.siteUrl.replace(/\/$/, '') + p;

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const waLink = (msg) => `https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`;
const telLink = (n) => `tel:${String(n).replace(/[^\d+]/g, '')}`;
const join = (arr, fn) => arr.map(fn).join('');

/* Empreinte courte pour forcer la mise à jour du cache navigateur. */
const hashes = {};
const assetUrl = (p) => {
  if (!hashes[p]) {
    const buf = fs.readFileSync(path.join(SRC, p));
    hashes[p] = crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);
  }
  return `/${p}?v=${hashes[p]}`;
};

/* Dimensions d'un fichier WebP (pour éviter les sauts de mise en page). */
function webpSize(file) {
  const b = fs.readFileSync(file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  throw new Error('WebP illisible : ' + file);
}

/**
 * Image responsive : cherche src/assets/img/<nom>-<largeur>.webp
 * et génère srcset + dimensions. Chargement différé par défaut.
 */
const IMG_DIR = path.join(SRC, 'assets', 'img');
function img(name, alt, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const variants = fs.readdirSync(IMG_DIR)
    .map((f) => f.match(new RegExp(`^${name}-(\\d+)\\.webp$`)))
    .filter(Boolean).map((m) => ({ w: +m[1], file: m[0] })).sort((a, b) => a.w - b.w);
  if (!variants.length) throw new Error(`Image introuvable : ${name}`);
  const big = variants[variants.length - 1];
  const [w, h] = webpSize(path.join(IMG_DIR, big.file));
  const fallback = variants.find((v) => v.w >= 700) || big;
  return `<img${cls ? ` class="${cls}"` : ''} src="/assets/img/${fallback.file}" srcset="${variants.map((v) => `/assets/img/${v.file} ${v.w}w`).join(', ')}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

/* ------------------------------------------------------------------ */
/* Décors (SVG inline légers)                                           */
/* ------------------------------------------------------------------ */
/* Feuilles tropicales : touche décorative seulement. */
const leaves = (cls = '') => `<svg class="leaves ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
  <g fill="none" stroke-linecap="round">
    <path d="M40 170C40 110 80 60 150 40" stroke="#06534D" stroke-width="2.2"/>
    <path d="M60 140c-18-4-30-16-34-30M75 118c-18-6-28-19-30-34M92 98c-16-8-24-22-24-36M110 80c-13-9-18-23-16-37M128 64c-10-10-12-24-8-36M60 140c14-12 30-16 46-14M75 118c14-12 31-15 46-11M92 98c13-11 30-13 45-8M110 80c12-9 27-11 40-6" stroke="#06534D" stroke-width="2"/>
  </g>
  <path d="M150 150c-2-22 10-38 34-44-2 24-14 40-34 44z" fill="#E8B84A"/>
  <path d="M152 148l26-36" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
  <path d="M20 60c14-18 34-22 52-12-14 18-34 22-52 12z" fill="#DC582A"/>
  <path d="M24 59l44-10" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

/* Illustration provisoire de la boîte distributrice ([photo à insérer]). */
const boxArt = (label) => `<svg class="box-art" viewBox="0 0 400 300" role="img" aria-label="${esc(label)}">
  <rect width="400" height="300" fill="#EEF4F1"/>
  <ellipse cx="200" cy="262" rx="150" ry="12" fill="#06534D" opacity=".08"/>
  <path d="M170 92c10-40 50-52 64-40 10 8 2 26 16 36-26 4-54 8-80 4z" fill="#fff" stroke="#DCE5E1" stroke-width="1.5"/>
  <path d="M84 100h232v150a8 8 0 01-8 8H92a8 8 0 01-8-8z" fill="#fff" stroke="#DCE5E1" stroke-width="1.5"/>
  <path d="M84 100h232l-24-22H108z" fill="#F6F8F6" stroke="#DCE5E1" stroke-width="1.5"/>
  <rect x="160" y="84" width="80" height="10" rx="5" fill="#DCE5E1"/>
  <path d="M84 206c50 6 90 30 110 52H92a8 8 0 01-8-8z" fill="#06534D"/>
  <path d="M316 150c-40 14-60 50-62 108h54a8 8 0 008-8z" fill="#06534D"/>
  <path d="M292 120c-14 10-18 26-12 40 14-10 18-26 12-40z" fill="#DC582A"/>
  <path d="M112 118c10 12 26 14 38 6-10-12-26-14-38-6z" fill="#E8B84A"/>
  <text x="200" y="160" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="30" fill="#06534D">PAPEL</text>
  <text x="200" y="192" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="30" fill="#DC582A">DOUX</text>
</svg>`;

/* ------------------------------------------------------------------ */
/* Composants                                                          */
/* ------------------------------------------------------------------ */
const pageHero = (p, extra = '', { image, alt = '' } = {}) => `
<section class="page-hero${image ? ' page-hero--image' : ''}">
  ${image ? `<div class="page-hero__bg" aria-hidden="true">${img(image, alt, { sizes: '100vw', eager: true })}</div>` : ''}
  <div class="hero__grain" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    <p class="kicker kicker--light reveal">${esc(p.kicker)}</p>
    <h1 class="display reveal">${esc(p.title1)} <em>${esc(p.title2)}</em></h1>
    ${p.intro ? `<p class="lead lead--light reveal">${esc(p.intro)}</p>` : ''}
    ${extra}
  </div>
  ${image ? '' : leaves('leaves--hero')}
</section>`;

const valueCards = (t) => `<ul class="values" role="list">${join(t.values, (v, i) => `
  <li class="card value reveal" style="--d:${i}">
    <span class="value__icon">${icon(v.icon, { draw: true, size: 40 })}</span>
    <h3 class="value__title">${esc(v.title)}</h3>
    <p>${esc(v.text)}</p>
  </li>`)}</ul>`;

const productMedia = (p, sizes) => p.image
  ? img(p.image, p.imageAlt, { sizes })
  : boxArt(p.imageAlt);

const specs = (t, p) => `<dl class="specs">
  <div><dt>${esc(t.productsPage.specCount)}</dt><dd>${esc(p.count)}</dd></div>
  <div><dt>${esc(t.productsPage.specPlies)}</dt><dd>${esc(p.plies)}</dd></div>
  <div><dt>${esc(t.productsPage.specSize)}</dt><dd>${esc(p.size)}</dd></div>
  <div><dt>${esc(t.productsPage.specPack)}</dt><dd>${esc(p.pack)}</dd></div>
</dl>`;

const orderMessage = (t, p) => t.whatsapp.orderMessage
  .replace('{product}', `${p.name} – ${p.variant}`).replace('{pack}', p.pack);

/* Champ de formulaire accessible (label + message d'erreur lié). */
function field(t, { name, label, type = 'text', required = false, options, hint, autocomplete, full = false, inputmode }) {
  const id = `f-${name}`;
  const req = required ? ` required aria-required="true"` : '';
  const star = required ? ` <span class="req" aria-hidden="true">*</span>` : '';
  const describedBy = [hint ? `${id}-hint` : '', `${id}-err`].filter(Boolean).join(' ');
  let control;
  if (options) {
    control = `<select id="${id}" name="${name}"${req} aria-describedby="${describedBy}">
      <option value="">${esc(options.choose)}</option>${join(options.list, (o) => `<option>${esc(o)}</option>`)}</select>`;
  } else if (type === 'textarea') {
    control = `<textarea id="${id}" name="${name}" rows="4"${req} aria-describedby="${describedBy}"></textarea>`;
  } else {
    control = `<input id="${id}" name="${name}" type="${type}"${autocomplete ? ` autocomplete="${autocomplete}"` : ''}${inputmode ? ` inputmode="${inputmode}"` : ''}${req} aria-describedby="${describedBy}">`;
  }
  return `<div class="field${full ? ' field--full' : ''}">
    <label for="${id}">${esc(label)}${star}</label>
    ${control}
    ${hint ? `<p class="field__hint" id="${id}-hint">${esc(hint)}</p>` : ''}
    <p class="field__error" id="${id}-err" aria-live="polite"></p>
  </div>`;
}

/* Formulaire complet avec zone de confirmation + repli WhatsApp. */
function form(t, { id, fields, submit, success, waMessage, track }) {
  return `<form class="form" id="${id}" data-form="${id}" data-track="${track}" data-wa-message="${esc(waMessage)}" novalidate>
    <div class="form__grid">${fields}</div>
    <div class="hp" aria-hidden="true"><label for="${id}-website">Website</label><input id="${id}-website" name="website" tabindex="-1" autocomplete="off"></div>
    <p class="form__privacy">${esc(t.form.privacy)}</p>
    <button class="btn btn--primary btn--block" type="submit">${esc(submit)}</button>
    <div class="form__status" role="status" aria-live="polite"></div>
  </form>
  <div class="form-success" id="${id}-success" hidden tabindex="-1">
    <span class="form-success__icon">${icon('check', { size: 32 })}</span>
    <h3>${esc(success.title)}</h3>
    <p>${esc(success.text)}</p>
    <a class="btn btn--wa" href="${waLink(waMessage)}" target="_blank" rel="noopener" data-wa="${id}-success">${glyph('whatsapp')} ${esc(success.cta)}</a>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Gabarit commun (en-tête, pied de page, SEO)                          */
/* ------------------------------------------------------------------ */
function layout(lang, page, { title, description, body, jsonld = [], scripts = [] }) {
  const t = content[lang];
  const other = lang === 'fr' ? 'en' : 'fr';
  const here = page === '404' ? url('home', lang) : url(page, lang);
  const og = abs('/assets/img/og-papel.jpg');
  const navItems = ['products', 'about', 'where', 'contact'];
  const navLink = (k) => `<li><a href="${url(k, lang)}"${k === page ? ' aria-current="page"' : ''}>${esc(t.nav[k])}</a></li>`;
  const js = {
    lang,
    whatsapp: cfg.whatsapp,
    endpoint: cfg.formEndpoint,
    ga4: cfg.ga4Id,
    pixel: cfg.metaPixelId,
    i18n: {
      sending: t.form.sending, errorRequired: t.form.errorRequired, errorPhone: t.form.errorPhone,
      errorSend: t.form.errorSend, fallbackWhatsapp: t.form.fallbackWhatsapp, fallbackText: t.form.fallbackText,
      menu: t.nav.menu, close: t.nav.close,
      showMap: t.where.showMap, hideMap: t.where.hideMap, results: t.where.results, mapError: t.where.mapError,
      directions: t.where.directions
    }
  };

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${page === '404' ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${abs(here)}">
<link rel="alternate" hreflang="fr" href="${abs(url(page, 'fr'))}">
<link rel="alternate" hreflang="en" href="${abs(url(page, 'en'))}">
<link rel="alternate" hreflang="x-default" href="${abs(url(page, 'fr'))}">`}
<meta name="theme-color" content="#06534D">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Papel">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${abs(here)}">
<meta property="og:image" content="${og}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Papel — ${esc(t.meta.tagline)}">
<meta property="og:locale" content="${t.meta.locale}">
<meta property="og:locale:alternate" content="${content[other].meta.locale}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/poppins-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/poppins-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assetUrl('assets/css/style.css')}">
<script>document.documentElement.classList.add('js');window.PAPEL=${JSON.stringify(js)};</script>
${join(jsonld, (j) => `<script type="application/ld+json">${JSON.stringify(j)}</script>\n`)}</head>
<body data-page="${page}">
<a class="skip" href="#main">${esc(t.meta.skip)}</a>

<header class="header">
  <div class="container header__inner">
    <a class="header__logo" href="${url('home', lang)}" aria-label="Papel — ${esc(t.nav.home)}">${logo()}</a>
    <nav class="nav" id="nav" aria-label="${esc(t.nav.menu)}">
      <ul class="nav__list" role="list">
        <li class="nav__home"><a href="${url('home', lang)}"${page === 'home' ? ' aria-current="page"' : ''}>${esc(t.nav.home)}</a></li>
        ${join(navItems, navLink)}
        <li class="nav__cta"><a class="btn btn--primary btn--sm" href="${url('distributor', lang)}"${page === 'distributor' ? ' aria-current="page"' : ''}>${esc(t.nav.cta)}</a></li>
      </ul>
      <a class="nav__wa btn btn--wa" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="menu">${glyph('whatsapp')} WhatsApp</a>
    </nav>
    <a class="lang" href="${page === '404' ? url('home', other) : url(page, other)}" hreflang="${other}" lang="${other}" aria-label="${esc(t.nav.langLabel)}">${icon('globe', { size: 18 })}<span>${t.nav.langShort}</span></a>
    <button class="burger" type="button" aria-controls="nav" aria-expanded="false" aria-label="${esc(t.nav.menu)}">
      <span class="burger__open">${icon('menu')}</span><span class="burger__close">${icon('close')}</span>
    </button>
  </div>
</header>

<main id="main" tabindex="-1">
${body}
</main>

<footer class="footer">
  <div class="container footer__grid">
    <div class="footer__brand">
      <a href="${url('home', lang)}" class="footer__logo" aria-label="Papel">${logo()}</a>
      <p class="footer__tagline"><em>${esc(t.meta.tagline)}</em></p>
      <p>${esc(t.footer.about)}</p>
    </div>
    <div>
      <h2 class="footer__title">${esc(t.footer.navTitle)}</h2>
      <ul class="footer__links" role="list">
        ${join(['home', 'products', 'about', 'distributor', 'where', 'contact'], (k) => `<li><a href="${url(k, lang)}">${esc(t.nav[k])}</a></li>`)}
      </ul>
    </div>
    <div>
      <h2 class="footer__title">${esc(t.footer.contactTitle)}</h2>
      <ul class="footer__links" role="list">
        <li><a href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="footer">${glyph('whatsapp', { size: 18 })} ${esc(cfg.whatsappDisplay)}</a></li>
        <li><a href="${telLink(cfg.phone)}">${icon('phone', { size: 18 })} ${esc(cfg.phoneDisplay)}</a></li>
        <li><a href="mailto:${esc(cfg.email)}">${icon('mail', { size: 18 })} ${esc(cfg.email)}</a></li>
        <li><span>${icon('pin', { size: 18 })} ${esc(cfg.address.city)}, ${esc(cfg.address.countryName)}</span></li>
      </ul>
    </div>
    <div>
      <h2 class="footer__title">${esc(t.footer.followTitle)} <span class="footer__handle">${esc(cfg.socialHandle)}</span></h2>
      <ul class="social" role="list">
        ${join(['facebook', 'instagram', 'tiktok', 'linkedin'], (s) => `<li><a href="${cfg.social[s]}" target="_blank" rel="noopener" aria-label="${s[0].toUpperCase() + s.slice(1)} ${esc(cfg.socialHandle)}" data-social="${s}">${glyph(s)}</a></li>`)}
      </ul>
    </div>
  </div>
  <div class="container footer__bottom">
    <p>© ${YEAR} ${esc(t.footer.company)}. ${esc(t.footer.rights)}</p>
    <p><a href="${url('legal', lang)}">${esc(t.footer.legal)}</a> · <a href="${page === '404' ? url('home', other) : url(page, other)}" hreflang="${other}" lang="${other}">${esc(t.nav.langLabel)}</a></p>
  </div>
</footer>

<a class="wa-float" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="float" aria-label="${esc(t.whatsapp.float)}">${glyph('whatsapp', { size: 30 })}<span class="wa-float__label">WhatsApp</span></a>

<script src="${assetUrl('assets/js/main.js')}" defer></script>
${join(scripts, (s) => `<script src="${assetUrl(s)}" defer></script>\n`)}</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Données structurées (Google)                                         */
/* ------------------------------------------------------------------ */
const orgLD = (lang) => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Papel',
  legalName: cfg.company,
  url: abs(url('home', lang)),
  logo: abs('/assets/img/icon-512.png'),
  slogan: content[lang].meta.tagline,
  sameAs: Object.values(cfg.social),
  address: { '@type': 'PostalAddress', streetAddress: cfg.address.street, addressLocality: cfg.address.city, addressCountry: cfg.address.country },
  contactPoint: [{ '@type': 'ContactPoint', telephone: cfg.phone, contactType: 'sales', areaServed: ['GN', 'SL'], availableLanguage: ['French', 'English'] }]
});

/* ------------------------------------------------------------------ */
/* PAGES                                                               */
/* ------------------------------------------------------------------ */

/* 1. ACCUEIL --------------------------------------------------------- */
function pageHome(lang) {
  const t = content[lang]; const h = t.home; const A = t.about;
  const body = `
<section class="hero hero--dark hero--type">
  <div class="hero__grain" aria-hidden="true"></div>
  ${leaves('leaves--hero-type')}
  <div class="container hero__grid">
    <div class="hero__text">
      <p class="eyebrow eyebrow--light reveal">${esc(h.hero.eyebrow)}</p>
      <h1 class="hero__title reveal"><span>${esc(h.hero.titleA)}</span> <em>${esc(h.hero.titleB)}</em></h1>
      <p class="lead lead--light reveal">${esc(h.hero.subtitle)}</p>
      <div class="actions reveal">
        <a class="btn btn--light" href="${url('products', lang)}">${esc(h.hero.ctaPrimary)} ${icon('arrow', { size: 20 })}</a>
        <a class="btn btn--outline-light" href="${url('distributor', lang)}">${esc(h.hero.ctaSecondary)}</a>
      </div>
      <p class="hero__launch reveal">${esc(h.hero.badge)}</p>
    </div>
  </div>
  <div class="hero__strip">
    <div class="container">
      <ul class="strip" role="list">${join(t.values, (v) => `<li>${esc(v.title)}</li>`)}</ul>
    </div>
  </div>
</section>

<section class="section section--white group" aria-labelledby="group-title">
  <div class="container group__grid">
    <div>
      <p class="kicker reveal">${esc(h.group.kicker)}</p>
      <h2 class="h2 h2--xl reveal" id="group-title">${esc(h.group.title)}</h2>
      <p class="lead reveal">${esc(h.group.text)}</p>
      <a class="link-arrow reveal" href="${url('about', lang)}">${esc(h.group.more)} ${icon('arrow', { size: 18 })}</a>
    </div>
    <dl class="facts reveal">${join(h.group.facts, (f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`)}</dl>
  </div>
</section>

<section class="showcase" aria-labelledby="factory-title">
  <div class="showcase__media">${img('usine-facade', h.factory.alt, { sizes: '100vw' })}</div>
  <div class="container showcase__inner">
    <div class="showcase__card reveal">
      <p class="kicker kicker--light">${esc(h.factory.kicker)}</p>
      <h2 class="h2" id="factory-title">${esc(h.factory.title)}</h2>
      <p>${esc(h.factory.text)}</p>
      <ol class="process process--light" role="list">${join(A.factorySteps, (s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`)}</ol>
    </div>
  </div>
  <div class="container">
    <ul class="figures" role="list">${join(h.factory.figures, (f, i) => `<li class="reveal" style="--d:${i}"><strong>${esc(f.v)}</strong><span>${esc(f.l)}</span></li>`)}</ul>
  </div>
</section>

<section class="section why" aria-labelledby="values-title">
  <div class="container">
    <div class="split-head">
      <div>
        <p class="kicker reveal">${esc(h.values.kicker)}</p>
        <h2 class="h2 h2--xl reveal" id="values-title">${esc(h.values.title)}</h2>
      </div>
      <p class="statement statement--sm reveal">${esc(h.why.textA)} <em>${esc(h.why.textB)}</em></p>
    </div>
    <ol class="pillars" role="list">${join(t.values, (v, i) => `
      <li class="pillar reveal" style="--d:${i}">
        <span class="pillar__num">0${i + 1}</span>
        <span class="pillar__icon">${icon(v.icon, { draw: true, size: 44 })}</span>
        <h3>${esc(v.title)}</h3>
        <p>${esc(v.text)}</p>
      </li>`)}
    </ol>
  </div>
</section>

<section class="section section--white range" aria-labelledby="range-title">
  <div class="container">
    <div class="split-head">
      <div>
        <p class="kicker reveal">${esc(h.range.kicker)}</p>
        <h2 class="h2 h2--xl reveal" id="range-title">${esc(h.range.title)}</h2>
      </div>
      <p class="reveal">${esc(h.range.text)}</p>
    </div>
    <ul class="range__grid" role="list">${join(t.products, (p, i) => `
      <li class="product-card reveal" style="--d:${i}">
        <a href="${url('products', lang)}#${p.id}" class="product-card__link">
          <div class="product-card__media">${productMedia(p, '(min-width: 900px) 44vw, 92vw')}</div>
          <div class="product-card__body">
            <h3><span>${esc(p.name)}</span> ${esc(p.variant)}</h3>
            <ul class="chips" role="list"><li>${esc(p.count)}</li><li>${esc(p.plies)}</li><li>${esc(p.size)}</li></ul>
            <span class="more">${esc(h.range.details)} ${icon('arrow', { size: 18 })}</span>
          </div>
        </a>
      </li>`)}
    </ul>
  </div>
</section>

<section class="vm-band" aria-label="${esc(h.vm.kicker)}">
  <div class="container vm-band__grid">
    <blockquote class="quote reveal">
      <p class="kicker kicker--light">${esc(A.visionLabel)}</p>
      <p class="quote__text">« ${esc(A.vision)} »</p>
    </blockquote>
    <blockquote class="quote reveal" style="--d:1">
      <p class="kicker kicker--light">${esc(A.missionLabel)}</p>
      <p class="quote__text">« ${esc(A.mission)} »</p>
    </blockquote>
  </div>
  ${leaves('leaves--band')}
</section>

<section class="section roadmap-teaser" aria-labelledby="road-title">
  <div class="container">
    <div class="split-head">
      <div>
        <p class="kicker reveal">${esc(h.roadmap.kicker)}</p>
        <h2 class="h2 h2--xl reveal" id="road-title">${esc(h.roadmap.title)}</h2>
      </div>
      <a class="link-arrow reveal" href="${url('about', lang)}#feuille-de-route">${esc(h.roadmap.more)} ${icon('arrow', { size: 18 })}</a>
    </div>
    <ol class="roadmap" role="list">${join(A.roadmap, (r, i) => `
      <li class="roadmap__step reveal${i === 0 ? ' is-current' : ''}" style="--d:${i}">
        <span class="roadmap__dot" aria-hidden="true">${i + 1}</span>
        <p class="roadmap__when">${esc(r.when)}</p>
        <h3>${esc(r.step)}</h3>
      </li>`)}
    </ol>
  </div>
</section>

<section class="band" aria-labelledby="band-title">
  <div class="container band__inner">
    <div>
      <h2 class="band__title reveal" id="band-title">${esc(h.band.title)} <em>${esc(h.band.titleB)}</em></h2>
      <p class="reveal">${esc(h.band.text)}</p>
    </div>
    <div class="actions reveal">
      <a class="btn btn--light" href="${url('distributor', lang)}">${esc(h.band.cta)} ${icon('arrow', { size: 20 })}</a>
      <a class="btn btn--outline-light" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="home-band">${glyph('whatsapp')} WhatsApp</a>
    </div>
  </div>
  ${leaves('leaves--band')}
</section>`;
  return layout(lang, 'home', { title: h.title, description: h.description, body, jsonld: [orgLD(lang)] });
}

/* 2. NOS PRODUITS ---------------------------------------------------- */
function pageProducts(lang) {
  const t = content[lang]; const P = t.productsPage;
  const body = `
${pageHero({ kicker: P.kicker, title1: P.title1, title2: P.title2, intro: P.intro })}

${join(t.products, (p, i) => `
<section class="section ${i % 2 ? '' : 'section--white'} product" id="${p.id}" aria-labelledby="${p.id}-title">
  <div class="container product__grid${i % 2 ? ' product__grid--flip' : ''}">
    <div class="product__media reveal">
      <div class="product__main">${productMedia(p, '(min-width: 900px) 46vw, 92vw')}${p.image ? '' : `<span class="product__soon">${esc(P.photoSoon)}</span>`}</div>
      ${p.gallery.length ? `<div class="product__gallery">${join(p.gallery, (g) => img(g.image, g.alt, { sizes: '(min-width: 900px) 22vw, 45vw' }))}</div>` : ''}
    </div>
    <div class="product__info">
      <p class="kicker reveal">${esc(p.name)}</p>
      <h2 class="h2 reveal" id="${p.id}-title">${esc(p.variant)}</h2>
      <p class="reveal">${esc(p.short)}</p>
      <div class="reveal">${specs(t, p)}</div>
      <ul class="checks reveal" role="list">${join(t.productFeatures, (f) => `<li>${icon('check', { size: 20 })} ${esc(f.title)}</li>`)}</ul>
      <p class="price reveal"><span>${esc(P.priceLabel)}</span> <strong>${esc(cfg.publicPrice)}</strong> <span>${esc(P.priceUnit)}</span></p>
      <div class="reveal">
        <a class="btn btn--wa" href="${waLink(orderMessage(t, p))}" target="_blank" rel="noopener" data-wa="order-${p.id}">${glyph('whatsapp')} ${esc(P.order)}</a>
        <p class="small">${esc(P.orderHint)} ${esc(P.priceNote)}</p>
      </div>
    </div>
  </div>
</section>`)}

<section class="section section--mint plies" aria-labelledby="plies-title">
  <div class="container plies__grid">
    <figure class="plies__media reveal">${img('trois-plis', t.plies.map((x) => x.title + ' : ' + x.text).join(' · '), { sizes: '(min-width: 900px) 40vw, 92vw' })}</figure>
    <div>
      <h2 class="h2 reveal" id="plies-title">${esc(P.pliesTitle)}</h2>
      <ol class="plies__list" role="list">${join(t.plies, (x, i) => `<li class="reveal" style="--d:${i}"><strong>${esc(x.title)}</strong><span>${esc(x.text)}</span></li>`)}</ol>
    </div>
  </div>
</section>

<section class="section" aria-labelledby="features-title">
  <div class="container">
    <h2 class="h2 center reveal" id="features-title">${esc(P.featuresTitle)}</h2>
    <ul class="features" role="list">${join(t.productFeatures, (f, i) => `
      <li class="feature reveal" style="--d:${i}">${icon(f.icon, { draw: true, size: 36 })}<h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></li>`)}
    </ul>
  </div>
</section>

<section class="section section--white soon" aria-labelledby="soon-title">
  <div class="container">
    <div class="section__head">
      <p class="kicker reveal">${esc(P.soonKicker)}</p>
      <h2 class="h2 reveal" id="soon-title">${esc(P.soonTitle)}</h2>
      <p class="reveal">${esc(P.soonText)}</p>
    </div>
    <ul class="soon__grid" role="list">${join(t.soon, (s, i) => `
      <li class="card soon__card reveal" style="--d:${i}"><span class="tag">${esc(P.soonBadge)}</span>${icon(s.icon, { draw: true, size: 40 })}<h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)}
    </ul>
  </div>
</section>`;

  const productLD = t.products.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.name} – ${p.variant}`,
    description: `${p.count}, ${p.plies}, ${p.size}. ${p.short}`,
    brand: { '@type': 'Brand', name: 'Papel' },
    ...(p.image ? { image: abs(`/assets/img/${p.image}-1000.webp`) } : {}),
    offers: { '@type': 'Offer', priceCurrency: 'GNF', price: String(cfg.publicPrice).replace(/\D/g, ''), availability: 'https://schema.org/PreOrder', areaServed: 'GN' }
  }));
  return layout(lang, 'products', { title: P.title, description: P.description, body, jsonld: productLD });
}

/* 3. À PROPOS -------------------------------------------------------- */
function pageAbout(lang) {
  const t = content[lang]; const A = t.about;
  const [main, ...rest] = A.factoryImages;
  const body = `
${pageHero(A, '', { image: 'usine-entree', alt: A.factoryCaption })}

<section class="section section--white group" aria-labelledby="group-title">
  <div class="container group__grid">
    <div>
      <p class="kicker reveal">${esc(t.home.group.kicker)}</p>
      <h2 class="h2 h2--xl reveal" id="group-title">${esc(t.home.group.title)}</h2>
      <p class="lead reveal">${esc(t.home.group.text)}</p>
    </div>
    <dl class="facts reveal">${join(t.home.group.facts, (f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.v)}</dd></div>`)}</dl>
  </div>
</section>

<section class="vm-band" aria-label="${esc(A.visionLabel)} / ${esc(A.missionLabel)}">
  <div class="container vm-band__grid">
    <blockquote class="quote reveal"><p class="kicker kicker--light">${esc(A.visionLabel)}</p><p class="quote__text">« ${esc(A.vision)} »</p></blockquote>
    <blockquote class="quote reveal" style="--d:1"><p class="kicker kicker--light">${esc(A.missionLabel)}</p><p class="quote__text">« ${esc(A.mission)} »</p></blockquote>
  </div>
  ${leaves('leaves--band')}
</section>

<section class="section" aria-labelledby="values-title">
  <div class="container">
    <div class="split-head">
      <div><p class="kicker reveal">${esc(t.home.values.kicker)}</p><h2 class="h2 h2--xl reveal" id="values-title">${esc(t.home.values.title)}</h2></div>
      <p class="statement statement--sm reveal">${esc(t.home.why.textA)} <em>${esc(t.home.why.textB)}</em></p>
    </div>
    <ol class="pillars" role="list">${join(t.values, (v, i) => `
      <li class="pillar reveal" style="--d:${i}"><span class="pillar__num">0${i + 1}</span><span class="pillar__icon">${icon(v.icon, { draw: true, size: 44 })}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></li>`)}
    </ol>
  </div>
</section>

<section class="section section--white factory" aria-labelledby="factory-title">
  <div class="container factory__grid">
    <div class="factory__text">
      <p class="kicker reveal">${esc(A.factoryKicker)}</p>
      <h2 class="h2 reveal" id="factory-title">${esc(A.factoryTitle)}</h2>
      <p class="reveal">${esc(A.factoryText)}</p>
      <ol class="process reveal" role="list">${join(A.factorySteps, (s, i) => `<li><span>${i + 1}</span>${esc(s)}</li>`)}</ol>
    </div>
    <figure class="factory__media reveal">
      ${img(main.image, main.alt, { sizes: '(min-width: 900px) 55vw, 92vw', cls: 'factory__main' })}
      <div class="factory__thumbs">${join(rest, (r) => img(r.image, r.alt, { sizes: '(min-width: 900px) 27vw, 45vw' }))}</div>
      <figcaption>${esc(A.factoryCaption)}</figcaption>
    </figure>
  </div>
</section>

<section class="section" aria-labelledby="ambitions-title">
  <div class="container">
    <div class="section__head">
      <p class="kicker reveal">${esc(A.ambitionsKicker)}</p>
      <h2 class="h2 reveal" id="ambitions-title">${esc(A.ambitionsTitle)}</h2>
    </div>
    <ul class="values" role="list">${join(A.ambitions, (a, i) => `
      <li class="card value reveal" style="--d:${i}"><span class="value__icon">${icon(a.icon, { draw: true, size: 40 })}</span><h3 class="value__title">${esc(a.title)}</h3><p>${esc(a.text)}</p><span class="tag">${esc(a.tag)}</span></li>`)}
    </ul>
  </div>
</section>

<section class="section section--white" id="feuille-de-route" aria-labelledby="roadmap-title">
  <div class="container">
    <div class="section__head">
      <p class="kicker reveal">${esc(A.roadmapKicker)}</p>
      <h2 class="h2 reveal" id="roadmap-title">${esc(A.roadmapTitle)}</h2>
    </div>
    <ol class="roadmap" role="list">${join(A.roadmap, (r, i) => `
      <li class="roadmap__step reveal${i === 0 ? ' is-current' : ''}" style="--d:${i}">
        <span class="roadmap__dot" aria-hidden="true">${i + 1}</span>
        <p class="roadmap__when">${esc(r.when)}</p>
        <h3>${esc(r.step)}</h3>
        <p>${esc(r.text)}</p>
      </li>`)}
    </ol>
  </div>
</section>`;
  return layout(lang, 'about', { title: A.title, description: A.description, body });
}

/* 4. DEVENIR DISTRIBUTEUR ------------------------------------------ */
function pageDistributor(lang) {
  const t = content[lang]; const D = t.distributor; const F = t.form;
  const fields = [
    field(t, { name: 'name', label: F.name, required: true, autocomplete: 'name' }),
    field(t, { name: 'company', label: F.company, autocomplete: 'organization' }),
    field(t, { name: 'type', label: F.type, required: true, options: { choose: F.typeChoose, list: F.types } }),
    field(t, { name: 'city', label: F.city, required: true, autocomplete: 'address-level2' }),
    field(t, { name: 'volume', label: F.volume, options: { choose: F.volumeChoose, list: F.volumes } }),
    field(t, { name: 'phone', label: F.phone, type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', hint: F.phoneHint }),
    field(t, { name: 'message', label: F.messageOptional, type: 'textarea', full: true })
  ].join('');
  const body = `
${pageHero(D, `<div class="actions reveal">
  <a class="btn btn--light" href="#demande">${esc(D.ctaForm)} ${icon('arrow', { size: 20 })}</a>
  <a class="btn btn--wa" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="distributor-hero">${glyph('whatsapp')} ${esc(D.ctaWhatsapp)}</a>
</div>`)}

<section class="section section--white" aria-labelledby="benefits-title">
  <div class="container">
    <h2 class="h2 reveal" id="benefits-title">${esc(D.benefitsTitle)}</h2>
    <ul class="benefits" role="list">${join(D.benefits, (b, i) => `
      <li class="benefit reveal" style="--d:${i}">${icon(b.icon, { draw: true, size: 36 })}<div><h3>${esc(b.title)}</h3><p>${esc(b.text)}</p></div></li>`)}
    </ul>
  </div>
</section>

<section class="section" id="demande" aria-labelledby="form-title">
  <div class="container form-layout">
    <div class="form-layout__aside">
      <h2 class="h2 reveal">${esc(D.stepsTitle)}</h2>
      <ol class="steps reveal" role="list">${join(D.steps, (s) => `<li>${esc(s)}</li>`)}</ol>
    </div>
    <div class="card form-card reveal">
      <h2 class="h3" id="form-title">${esc(D.formTitle)}</h2>
      <p class="small">${esc(D.formIntro)}</p>
      ${form(t, { id: 'distributeur', fields, submit: D.submit, track: 'distributor_form', waMessage: t.whatsapp.distributorMessage, success: { title: D.successTitle, text: D.successText, cta: D.successCta } })}
    </div>
  </div>
</section>`;
  return layout(lang, 'distributor', { title: D.title, description: D.description, body });
}

/* 5. OÙ ACHETER ------------------------------------------------------ */
function pageWhere(lang) {
  const t = content[lang]; const W = t.where; const F = t.form;
  let locator;
  if (!points.length) {
    // Au lancement : pas encore de points de vente → alerte « prévenez-moi ».
    const fields = [
      field(t, { name: 'phone', label: F.phone, type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', hint: F.phoneHint }),
      field(t, { name: 'city', label: F.city, required: true, autocomplete: 'address-level2' })
    ].join('');
    locator = `
<section class="section section--white" aria-labelledby="soon-title">
  <div class="container soon-box">
    <div class="soon-box__text">
      <span class="soon-box__icon">${icon('pin', { draw: true, size: 44 })}</span>
      <h2 class="h2 reveal" id="soon-title">${esc(W.soonTitle)}</h2>
      <p class="reveal">${esc(W.soonText)}</p>
    </div>
    <div class="card form-card reveal">
      ${form(t, { id: 'alerte', fields, submit: W.notifySubmit, track: 'notify_form', waMessage: t.whatsapp.notifyMessage, success: { title: W.notifySuccess, text: '', cta: 'WhatsApp' } })}
    </div>
  </div>
</section>`;
  } else {
    const cities = [...new Set(points.map((p) => p.city))];
    locator = `
<section class="section section--white" aria-label="${esc(W.kicker)}">
  <div class="container locator" data-locator>
    <div class="locator__tools">
      <label class="search" for="loc-search"><span class="sr-only">${esc(W.search)}</span>${icon('search', { size: 20 })}
        <input id="loc-search" type="search" placeholder="${esc(W.searchPlaceholder)}" autocomplete="off"></label>
      <div class="filters" role="group" aria-label="${esc(W.search)}">
        <button type="button" class="filter" aria-pressed="true" data-city="">${esc(W.all)}</button>
        ${join(cities, (c) => `<button type="button" class="filter" aria-pressed="false" data-city="${esc(c)}">${esc(c)}</button>`)}
      </div>
      <button type="button" class="btn btn--ghost btn--sm" data-map-toggle aria-expanded="false" aria-controls="map">${icon('map', { size: 20 })} <span>${esc(W.showMap)}</span></button>
      <p class="small">${esc(W.mapNote)}</p>
    </div>
    <div class="map" id="map" hidden></div>
    <p class="locator__count" role="status" aria-live="polite"></p>
    <ul class="stores" role="list">${join(points, (p) => `
      <li class="store" data-city="${esc(p.city)}" data-search="${esc([p.name, p.city, p.area, p.address].join(' ').toLowerCase())}" data-lat="${p.lat}" data-lng="${p.lng}" data-name="${esc(p.name)}">
        <span class="tag">${esc(W.types[p.type] || p.type)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${icon('pin', { size: 18 })} ${esc([p.address, p.area, p.city].filter(Boolean).join(', '))}</p>
        <div class="store__actions">
          <a class="btn btn--ghost btn--sm" href="https://www.google.com/maps/dir/?api=1&amp;destination=${p.lat},${p.lng}" target="_blank" rel="noopener" data-track-click="directions">${esc(W.directions)}</a>
          ${p.phone ? `<a class="btn btn--ghost btn--sm" href="${telLink(p.phone)}">${icon('phone', { size: 18 })} ${esc(W.call)}</a>` : ''}
        </div>
      </li>`)}
    </ul>
    <p class="locator__none" hidden>${esc(W.none)}</p>
  </div>
</section>`;
  }
  const body = `
${pageHero(W)}
${locator}
<section class="band band--compact" aria-labelledby="seller-title">
  <div class="container band__inner">
    <div><h2 class="band__title" id="seller-title">${esc(W.sellerTitle)}</h2><p>${esc(W.sellerText)}</p></div>
    <div class="actions"><a class="btn btn--light" href="${url('distributor', lang)}">${esc(W.sellerCta)} ${icon('arrow', { size: 20 })}</a></div>
  </div>
</section>`;
  return layout(lang, 'where', { title: W.title, description: W.description, body, scripts: points.length ? ['assets/js/locator.js'] : [] });
}

/* 6. CONTACT --------------------------------------------------------- */
function pageContact(lang) {
  const t = content[lang]; const C = t.contact; const F = t.form;
  const fields = [
    field(t, { name: 'name', label: F.name, required: true, autocomplete: 'name' }),
    field(t, { name: 'phone', label: F.phone, type: 'tel', required: true, autocomplete: 'tel', inputmode: 'tel', hint: F.phoneHint }),
    field(t, { name: 'email', label: F.email, type: 'email', autocomplete: 'email' }),
    field(t, { name: 'subject', label: F.subject, options: { choose: F.typeChoose, list: C.subjects } }),
    field(t, { name: 'message', label: F.message, type: 'textarea', required: true, full: true })
  ].join('');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${cfg.address.lat},${cfg.address.lng}`;
  const body = `
${pageHero(C)}
<section class="section section--white" aria-label="${esc(C.kicker)}">
  <div class="container contact">
    <ul class="contact__list" role="list">
      <li class="contact__item contact__item--wa reveal">
        ${glyph('whatsapp', { size: 32 })}
        <div><h2 class="h4">${esc(C.whatsapp)}</h2><p>${esc(cfg.whatsappDisplay)}</p>
        <a class="btn btn--wa" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="contact">${esc(C.whatsappCta)}</a></div>
      </li>
      <li class="contact__item reveal">${icon('phone', { draw: true, size: 28 })}<div><h2 class="h4">${esc(C.phone)}</h2><a href="${telLink(cfg.phone)}">${esc(cfg.phoneDisplay)}</a></div></li>
      <li class="contact__item reveal">${icon('mail', { draw: true, size: 28 })}<div><h2 class="h4">${esc(C.email)}</h2><a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></div></li>
      <li class="contact__item reveal">${icon('pin', { draw: true, size: 28 })}<div><h2 class="h4">${esc(C.address)}</h2><p>${esc(cfg.address.street)}<br>${esc(cfg.address.city)}, ${esc(cfg.address.countryName)}</p><a href="${mapUrl}" target="_blank" rel="noopener">${esc(C.mapLink)}</a></div></li>
      <li class="contact__item reveal">${icon('clock', { draw: true, size: 28 })}<div><h2 class="h4">${esc(C.hours)}</h2>${join(C.hoursValue, (h) => `<p>${esc(h)}</p>`)}</div></li>
    </ul>
    <div class="card form-card reveal">
      <h2 class="h3">${esc(C.formTitle)}</h2>
      ${form(t, { id: 'contact', fields, submit: C.submit, track: 'contact_form', waMessage: t.whatsapp.defaultMessage, success: { title: C.successTitle, text: C.successText, cta: C.successCta } })}
    </div>
  </div>
</section>`;
  return layout(lang, 'contact', { title: C.title, description: C.description, body, jsonld: [orgLD(lang)] });
}

/* 7. MENTIONS LÉGALES / 404 ----------------------------------------- */
function pageLegal(lang) {
  const t = content[lang]; const L = t.legal;
  const body = `
<section class="page-hero page-hero--small"><div class="container"><p class="kicker kicker--light">${esc(L.kicker)}</p><h1 class="display">${esc(L.heading)}</h1></div></section>
<section class="section section--white"><div class="container prose">${join(L.sections, (s) => `<h2 class="h4">${esc(s.title)}</h2><p>${esc(s.text)}</p>`)}</div></section>`;
  return layout(lang, 'legal', { title: L.title, description: L.description, body });
}

function page404(lang) {
  const t = content[lang]; const N = t.notFound;
  const body = `
<section class="page-hero page-hero--center"><div class="container">
  <p class="kicker kicker--light">404</p><h1 class="display">${esc(N.heading)}</h1><p class="lead lead--light">${esc(N.text)}</p>
  <div class="actions actions--center"><a class="btn btn--light" href="${url('home', lang)}">${esc(N.cta)}</a>
  <a class="btn btn--wa" href="${waLink(t.whatsapp.defaultMessage)}" target="_blank" rel="noopener" data-wa="404">${glyph('whatsapp')} WhatsApp</a></div>
</div>${leaves('leaves--hero')}</section>`;
  return layout(lang, '404', { title: N.title, description: N.text, body });
}

/* ------------------------------------------------------------------ */
/* Écriture des fichiers                                               */
/* ------------------------------------------------------------------ */
/* Minification prudente du HTML : retire seulement l'indentation (les espaces entre mots restent). */
const minifyHTML = (h) => h.replace(/\n\s+/g, '\n');
const minifyCSS = (c) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')
  .replace(/\s*([{};,>])\s*/g, '$1').replace(/;}/g, '}').trim();

function write(rel, data) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
}

function copyDir(from, to) {
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, e.name); const b = path.join(to, e.name);
    if (e.isDirectory()) { fs.mkdirSync(b, { recursive: true }); copyDir(a, b); } else fs.copyFileSync(a, b);
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(SRC, OUT);
// CSS minifiée en sortie (la source reste lisible et commentée).
write('assets/css/style.css', minifyCSS(fs.readFileSync(path.join(SRC, 'assets/css/style.css'), 'utf8')));
// Données des points de vente aussi publiées en JSON (réutilisables par une app, Odoo, etc.).
write('data/points-de-vente.json', JSON.stringify(points));

const PAGES = { home: pageHome, products: pageProducts, about: pageAbout, distributor: pageDistributor, where: pageWhere, contact: pageContact, legal: pageLegal };
for (const lang of LANGS) {
  for (const [key, fn] of Object.entries(PAGES)) write(path.join(url(key, lang), 'index.html'), minifyHTML(fn(lang)));
}
write('404.html', minifyHTML(page404('fr')));
write('en/404.html', minifyHTML(page404('en')));

// Plan du site + robots
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${join(Object.keys(PAGES), (k) => join(LANGS, (l) => `<url><loc>${abs(url(k, l))}</loc>${join(LANGS, (a) => `<xhtml:link rel="alternate" hreflang="${a}" href="${abs(url(k, a))}"/>`)}<changefreq>monthly</changefreq><priority>${k === 'home' ? '1.0' : k === 'distributor' ? '0.9' : '0.7'}</priority></url>\n`))}</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
write('site.webmanifest', JSON.stringify({
  name: 'Papel', short_name: 'Papel', start_url: '/', display: 'browser', lang: 'fr',
  background_color: '#F6F8F6', theme_color: '#06534D',
  icons: [{ src: '/assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }]
}));

/* Rapport : taille de l'accueil + éléments à compléter. */
const size = (f) => fs.statSync(path.join(OUT, f)).size;
const homeBytes = size('index.html') + size('assets/css/style.css') + size('assets/js/main.js')
  + size('assets/fonts/poppins-400.woff2') + size('assets/fonts/poppins-600.woff2') + size('assets/fonts/poppins-700.woff2')
  + size('assets/fonts/lora-italic-500.woff2');
console.log(`✔ Site généré dans dist/ (${LANGS.length * Object.keys(PAGES).length} pages).`);
console.log(`  Poids initial de l'accueil (hors images différées) : ~${Math.round(homeBytes / 1024)} Ko`);
const todo = Object.entries(cfg).filter(([k, v]) => typeof v === 'string' && !k.startsWith('_') && /\[|XXX/.test(v)).map(([k]) => k);
if (todo.length) console.log(`  ⚠ À compléter dans content/config.json : ${todo.join(', ')}`);
if (!cfg.formEndpoint) console.log('  ⚠ formEndpoint vide : les formulaires basculent sur WhatsApp.');
