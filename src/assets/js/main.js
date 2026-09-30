/**
 * PAPEL — script principal (~6 Ko, sans dépendance).
 * 1. Menu mobile          2. Animations au défilement
 * 3. Suivi des conversions (clics WhatsApp, téléphone, formulaires)
 * 4. Formulaires (validation, envoi JSON compatible Odoo, repli WhatsApp)
 * 5. Chargement différé de la mesure d'audience (GA4 / Meta Pixel)
 */
(function () {
  'use strict';
  var P = window.PAPEL || {};
  var T = P.i18n || {};
  var doc = document;
  var root = doc.documentElement;

  /* ------------------------------------------------------------------ */
  /* 1. Menu mobile                                                      */
  /* ------------------------------------------------------------------ */
  var burger = doc.querySelector('.burger');
  if (burger) {
    var setMenu = function (open) {
      root.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? T.close : T.menu);
    };
    burger.addEventListener('click', function () { setMenu(!root.classList.contains('nav-open')); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && root.classList.contains('nav-open')) { setMenu(false); burger.focus(); }
    });
    doc.querySelectorAll('.nav a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  }

  /* ------------------------------------------------------------------ */
  /* 2. Apparition au défilement + tracé progressif des icônes           */
  /* ------------------------------------------------------------------ */
  var animated = doc.querySelectorAll('.reveal, .ico-draw');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    animated.forEach(function (el) { io.observe(el); });
  } else {
    animated.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------------ */
  /* 3. Suivi des conversions                                            */
  /*    Envoie vers dataLayer (Google Tag Manager), GA4 et Meta Pixel    */
  /*    s'ils sont présents. Noms d'événements :                        */
  /*    whatsapp_click, phone_click, email_click, social_click,          */
  /*    generate_lead (formulaire distributeur), contact_form_submit,    */
  /*    notify_signup (alerte « Où acheter »)                            */
  /* ------------------------------------------------------------------ */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) {
    params = params || {};
    params.lang = P.lang;
    params.page = doc.body.getAttribute('data-page');
    window.dataLayer.push(Object.assign({ event: name }, params));
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
    if (typeof window.fbq === 'function') {
      if (name === 'generate_lead') window.fbq('track', 'Lead', params);
      else if (name === 'whatsapp_click') window.fbq('track', 'Contact', params);
      else window.fbq('trackCustom', name, params);
    }
  }
  window.papelTrack = track;

  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (a.hasAttribute('data-wa') || href.indexOf('wa.me') > -1) track('whatsapp_click', { location: a.getAttribute('data-wa') || 'link' });
    else if (href.indexOf('tel:') === 0) track('phone_click', {});
    else if (href.indexOf('mailto:') === 0) track('email_click', {});
    else if (a.hasAttribute('data-social')) track('social_click', { network: a.getAttribute('data-social') });
    else if (a.hasAttribute('data-track-click')) track(a.getAttribute('data-track-click'), {});
  });

  /* ------------------------------------------------------------------ */
  /* 4. Formulaires                                                      */
  /* ------------------------------------------------------------------ */
  var LEAD_EVENT = { distributor_form: 'generate_lead', contact_form: 'contact_form_submit', notify_form: 'notify_signup' };

  function waUrl(text) { return 'https://wa.me/' + P.whatsapp + '?text=' + encodeURIComponent(text); }

  function setError(field, msg) {
    var wrap = field.closest('.field');
    if (!wrap) return;
    wrap.classList.toggle('is-invalid', !!msg);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    var err = wrap.querySelector('.field__error');
    if (err) err.textContent = msg || '';
  }

  function validate(form) {
    var firstBad = null;
    form.querySelectorAll('input, select, textarea').forEach(function (f) {
      if (f.name === 'website') return;
      var v = f.value.trim(); var msg = '';
      if (f.required && !v) msg = T.errorRequired;
      else if (f.type === 'tel' && v && v.replace(/\D/g, '').length < 9) msg = T.errorPhone;
      else if (f.type === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) msg = T.errorRequired;
      setError(f, msg);
      if (msg && !firstBad) firstBad = f;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* Résumé lisible (message WhatsApp de repli / corps d'e-mail). */
  function summary(form, data) {
    var lines = [form.getAttribute('data-wa-message')];
    form.querySelectorAll('.field').forEach(function (w) {
      var f = w.querySelector('input, select, textarea'); var l = w.querySelector('label');
      if (f && data[f.name]) lines.push('• ' + l.textContent.replace('*', '').trim() + ' : ' + data[f.name]);
    });
    return lines.join('\n');
  }

  /* Charge utile JSON : champs bruts + bloc « odoo » prêt pour crm.lead. */
  function payload(form, data) {
    var kind = form.getAttribute('data-form');
    var text = summary(form, data);
    return Object.assign({}, data, {
      form: kind,
      lang: P.lang,
      page: location.href,
      submitted_at: new Date().toISOString(),
      _subject: 'Papel – ' + kind + ' – ' + (data.name || data.phone || ''),
      message_summary: text,
      odoo: {
        name: 'Site web – ' + kind + ' – ' + (data.company || data.name || data.phone || ''),
        contact_name: data.name || '',
        partner_name: data.company || '',
        phone: data.phone || '',
        email_from: data.email || '',
        city: data.city || '',
        description: text,
        type: 'lead',
        tag: kind
      }
    });
  }

  function showSuccess(form) {
    var box = doc.getElementById(form.id + '-success');
    form.hidden = true;
    if (box) { box.hidden = false; box.focus(); }
  }

  function showFallback(form, msg, text) {
    var status = form.querySelector('.form__status');
    status.textContent = '';
    var p = doc.createElement('p'); p.style.margin = '0'; p.textContent = msg;
    var a = doc.createElement('a');
    a.className = 'btn btn--wa'; a.href = waUrl(text); a.target = '_blank'; a.rel = 'noopener';
    a.setAttribute('data-wa', form.id + '-fallback');
    a.textContent = T.fallbackWhatsapp;
    status.appendChild(p); status.appendChild(a);
  }

  doc.querySelectorAll('form[data-form]').forEach(function (form) {
    // Efface l'erreur dès que l'utilisateur corrige un champ
    form.addEventListener('input', function (e) { if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, ''); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = String(v).trim(); });
      if (data.website) return; // pot de miel anti-robots
      delete data.website;

      var btn = form.querySelector('[type="submit"]');
      var label = btn.textContent;
      var status = form.querySelector('.form__status');
      var text = summary(form, data);
      var eventName = LEAD_EVENT[form.getAttribute('data-track')] || 'form_submit';

      // Aucun point de réception configuré : on passe par WhatsApp.
      if (!P.endpoint) {
        track(eventName, { form: form.id, method: 'whatsapp_fallback' });
        showFallback(form, T.fallbackText, text);
        return;
      }

      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; btn.textContent = T.sending;
      status.textContent = '';
      var ctrl = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000); // réseau 3G instable

      fetch(P.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload(form, data)),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        track(eventName, { form: form.id, method: 'form' });
        showSuccess(form);
      }).catch(function () {
        showFallback(form, T.errorSend, text);
      }).then(function () {
        clearTimeout(timer);
        btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = label;
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* 5. Mesure d'audience, chargée après la page (n'alourdit pas l'accueil) */
  /* ------------------------------------------------------------------ */
  function loadAnalytics() {
    if (P.ga4) {
      var s = doc.createElement('script');
      s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + P.ga4;
      doc.head.appendChild(s);
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', P.ga4, { anonymize_ip: true });
    }
    if (P.pixel) {
      /* Code standard Meta Pixel */
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, doc, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', P.pixel); window.fbq('track', 'PageView');
    }
  }
  if (P.ga4 || P.pixel) {
    window.addEventListener('load', function () {
      ('requestIdleCallback' in window) ? requestIdleCallback(loadAnalytics, { timeout: 4000 }) : setTimeout(loadAnalytics, 2000);
    });
  }
})();
