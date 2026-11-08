/* Nail Art Sakura · interactions et motion design
   GSAP + ScrollTrigger + Lenis (chargés en local, aucun service externe). */
(() => {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const DESKTOP = '(min-width: 900px) and (prefers-reduced-motion: no-preference)';
  const MOBILE = '(max-width: 899px), (prefers-reduced-motion: reduce)';

  let lenis = null;
  let menuIsOpen = false;

  /* ───────── texte découpé : mots ou lettres sous un masque ───────── */
  function split(el, { chars = false } = {}) {
    if (!el.dataset.split) {
      const label = el.textContent.trim().replace(/\s+/g, ' ');
      const frag = document.createDocumentFragment();
      const walk = (node, target) => {
        node.childNodes.forEach((n) => {
          if (n.nodeType === 3) {
            n.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span');
              w.className = 'w';
              w.setAttribute('aria-hidden', 'true');
              const wi = document.createElement('span');
              wi.className = 'wi';
              if (chars) {
                Array.from(tok).forEach((c) => {
                  const s = document.createElement('span');
                  s.className = 'ch';
                  s.textContent = c;
                  wi.appendChild(s);
                });
              } else {
                wi.textContent = tok;
              }
              w.appendChild(wi);
              target.appendChild(w);
            });
          } else if (n.nodeType === 1) {
            if (n.tagName === 'BR') { target.appendChild(n.cloneNode()); return; }
            const c = n.cloneNode(false);
            walk(n, c);
            target.appendChild(c);
          }
        });
      };
      walk(el, frag);
      el.textContent = '';
      el.appendChild(frag);
      if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-label', label);
      el.dataset.split = chars ? 'chars' : 'words';
    }
    return $$(el.dataset.split === 'chars' ? '.ch' : '.wi', el);
  }

  /* ───────── fonctions utiles, indépendantes de GSAP ───────── */

  function openingStatus() {
    const rows = $$('#hours tr');
    const status = $('#open-status');
    if (!rows.length || !status) return;
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const map = { 'dim.': 0, 'lun.': 1, 'mar.': 2, 'mer.': 3, 'jeu.': 4, 'ven.': 5, 'sam.': 6 };
    const day = map[get('weekday').toLowerCase()];
    const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10);
    const OPEN = 10 * 60, CLOSE = 18 * 60;
    rows.forEach((r) => r.classList.toggle('is-today', Number(r.dataset.day) === day));
    const workday = day >= 2 && day <= 6;
    const label = status.querySelector('span');
    if (workday && mins >= OPEN && mins < CLOSE) {
      status.classList.add('is-open');
      label.textContent = 'Ouvert maintenant · jusqu’à 18h';
    } else if (workday && mins < OPEN) {
      label.textContent = 'Fermé · ouvre aujourd’hui à 10h';
    } else if (day >= 2 && day <= 5) {
      label.textContent = 'Fermé · rouvre demain à 10h';
    } else {
      label.textContent = 'Fermé · rouvre mardi à 10h';
    }
  }

  function composer() {
    const form = $('#composer-form');
    if (!form) return;
    const lines = $('#ticket-lines');
    const timeEl = $('#ticket-time');
    const priceEl = $('#ticket-price');
    const draw = $('#draw');
    const drawOut = $('#draw-out');
    const fmtTime = (m) => {
      const h = Math.floor(m / 60), r = m % 60;
      return h ? (r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`) : `${r} min`;
    };
    const shown = { price: 0 };
    const writePrice = (v) => { priceEl.textContent = `${Math.round(v)} €`; };

    const update = () => {
      let price = 0, min = 0;
      const items = [];
      $$('input[name=base]:checked, input[name=fx]:checked, input[name=extra]:checked', form).forEach((i) => {
        items.push([i.value, Number(i.dataset.price)]);
        price += Number(i.dataset.price);
        min += Number(i.dataset.min);
      });
      const n = Number(draw.value);
      draw.style.setProperty('--fill', `${n * 10}%`);
      if (n) {
        items.push([`${n} dessin${n > 1 ? 's' : ''} à main levée`, n * 3]);
        price += n * 3;
        min += n * 5;
        drawOut.textContent = `${n} dessin${n > 1 ? 's' : ''} · +${n * 3} € · +${n * 5} min`;
      } else {
        drawOut.textContent = 'Aucun dessin';
      }
      lines.textContent = '';
      items.forEach(([name, p]) => {
        const li = document.createElement('li');
        const s = document.createElement('span');
        s.textContent = name;
        const b = document.createElement('b');
        b.textContent = `${p} €`;
        li.append(s, b);
        lines.appendChild(li);
      });
      timeEl.textContent = fmtTime(min);
      if (hasGsap && !reduce) {
        gsap.to(shown, { price, duration: 0.7, ease: 'power3.out', onUpdate: () => writePrice(shown.price), overwrite: true });
        gsap.fromTo(lines.children, { y: 8, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
      } else {
        shown.price = price;
        writePrice(price);
      }
    };
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    update();
  }

  function lightbox() {
    const items = $$('.g-item');
    const lb = $('#lightbox');
    if (!items.length || !lb) return;
    const img = $('#lb-img'), cap = $('#lb-cap');
    const btnClose = $('#lb-close'), btnPrev = $('#lb-prev'), btnNext = $('#lb-next');
    let idx = 0, last = null;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const im = $('img', it);
      img.src = im.currentSrc || im.src;
      img.alt = im.alt;
      cap.textContent = it.dataset.cap || '';
      if (hasGsap && !reduce) gsap.fromTo(img, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'Tab') {
        const f = [btnClose, btnPrev, btnNext];
        const cur = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(cur + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    function open(i) {
      last = document.activeElement;
      show(i);
      lb.hidden = false;
      if (hasGsap && !reduce) gsap.fromTo(lb, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });
      if (lenis) lenis.stop();
      btnClose.focus();
      document.addEventListener('keydown', onKey);
    }
    function close() {
      lb.hidden = true;
      if (lenis && !menuIsOpen) lenis.start();
      document.removeEventListener('keydown', onKey);
      if (last) last.focus();
    }
    items.forEach((it, i) => it.addEventListener('click', () => open(i)));
    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', () => show(idx - 1));
    btnNext.addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  }

  function videos() {
    const hv = $('#hero-video');
    const bv = $('#book-video');
    if (hv) {
      hv.muted = true;
      if (!reduce) {
        hv.src = matchMedia('(max-width: 800px)').matches ? hv.dataset.srcSm : hv.dataset.src;
        hv.play().catch(() => {});
      }
    }
    if (bv && !reduce && 'IntersectionObserver' in window) {
      bv.muted = true;
      new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            if (!bv.src) bv.src = bv.dataset.src;
            bv.play().catch(() => {});
          } else {
            bv.pause();
          }
        });
      }, { rootMargin: '200px' }).observe(bv);
    }
    if (hv && !reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) hv.play().catch(() => {}); else hv.pause(); });
      }).observe(hv);
    }
  }

  /* menu mobile plein écran */
  function menu() {
    const burger = $('#burger'), m = $('#menu'), nav = $('#nav');
    if (!burger || !m) return;
    const links = $$('.menu__links a, .menu__foot > *', m);
    if (hasGsap && !reduce) {
      m.style.transform = 'none';
      gsap.set(m, { yPercent: -101 });
    }
    const set = (o) => {
      if (menuIsOpen === o) return;
      menuIsOpen = o;
      burger.setAttribute('aria-expanded', String(o));
      burger.setAttribute('aria-label', o ? 'Fermer le menu' : 'Ouvrir le menu');
      m.setAttribute('aria-hidden', String(!o));
      nav.classList.toggle('is-menu', o);
      if (hasGsap && !reduce) {
        if (o) {
          gsap.set(m, { visibility: 'visible' });
          gsap.to(m, { yPercent: 0, duration: 1, ease: 'expo.out', overwrite: true });
          gsap.fromTo(links, { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: 0.07, delay: 0.25, ease: 'expo.out' });
        } else {
          gsap.to(m, { yPercent: -101, duration: 0.8, ease: 'expo.inOut', overwrite: true, onComplete: () => gsap.set(m, { visibility: 'hidden' }) });
        }
      } else {
        m.style.visibility = o ? 'visible' : 'hidden';
        m.style.transform = o ? 'none' : 'translateY(-101%)';
      }
      if (lenis) (o ? lenis.stop() : lenis.start());
      document.documentElement.style.overflow = !lenis && o ? 'hidden' : '';
    };
    burger.addEventListener('click', () => set(!menuIsOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuIsOpen) set(false); });
    $$('a', m).forEach((a) => a.addEventListener('click', () => set(false)));
    matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* défilement vers les ancres (compatible Lenis) */
  function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      a.addEventListener('click', (e) => {
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
        history.replaceState(null, '', id);
      });
    });
  }

  /* ───────── pétales de cerisier (canvas) ───────── */
  function petals() {
    const cv = $('#petals');
    if (!cv || reduce) return null;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const shape = new Path2D('M0,0 C-3,-2 -6,-6 -5,-9 C-4.4,-10.6 -2.2,-10.8 0,-9 C2.2,-10.8 4.4,-10.6 5,-9 C6,-6 3,-2 0,0 Z');
    const colors = ['247,217,225', '238,155,177', '255,255,255', '238,155,177', '197,38,79'];
    const list = [];
    let W = 0, H = 0, wind = 0, windTarget = 0, raf = 0;
    const COUNT = innerWidth < 700 ? 12 : 26;
    const resize = () => {
      W = innerWidth; H = innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    };
    const spawn = (p, initial) => {
      p.x = Math.random() * W;
      p.y = initial ? Math.random() * H : -24;
      p.s = 7 + Math.random() * 11;
      p.r = Math.random() * 6.28;
      p.vr = (Math.random() - 0.5) * 0.02;
      p.vy = 0.35 + Math.random() * 0.75;
      p.vx = (Math.random() - 0.5) * 0.3;
      p.ph = Math.random() * 6.28;
      p.sw = 0.4 + Math.random() * 0.9;
      p.a = 0.3 + Math.random() * 0.45;
      p.c = colors[(Math.random() * colors.length) | 0];
      return p;
    };
    const frame = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      windTarget *= 0.94;
      wind += (windTarget - wind) * 0.06;
      for (const p of list) {
        p.ph += 0.012 * p.sw;
        p.x += p.vx + Math.sin(p.ph) * 0.6 * p.sw + wind;
        p.y += p.vy + Math.abs(wind) * 0.25;
        p.r += p.vr + wind * 0.01;
        if (p.y > H + 30 || p.x < -50 || p.x > W + 50) spawn(p, false);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        const k = p.s / 10;
        ctx.scale(k, k * (0.6 + 0.4 * Math.cos(p.ph * 1.7)));
        ctx.fillStyle = `rgba(${p.c},${p.a})`;
        ctx.fill(shape);
        ctx.restore();
      }
      raf = requestAnimationFrame(frame);
    };
    resize();
    for (let i = 0; i < COUNT; i++) list.push(spawn({}, true));
    addEventListener('resize', resize);
    raf = requestAnimationFrame(frame);
    return { gust: (v) => { windTarget = Math.max(-4, Math.min(4, v)); } };
  }

  /* ───────── curseur, boutons magnétiques, inclinaison 3D ───────── */
  function cursor() {
    const c = $('#cursor');
    if (!c || !finePointer || reduce || !hasGsap) return;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.45, ease: 'power3' });
    const yTo = gsap.quickTo(c, 'y', { duration: 0.45, ease: 'power3' });
    const label = $('.cursor__label', c);
    addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('a, button, label, input[type=range], [data-cursor]');
      c.classList.toggle('is-big', !!t);
      const txt = e.target.closest('[data-cursor]');
      label.textContent = txt ? txt.dataset.cursor : '';
      c.classList.toggle('has-label', !!txt);
    });
  }

  function magnetic() {
    if (!finePointer || reduce || !hasGsap) return;
    $$('.magnetic').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'elastic.out(1,.55)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'elastic.out(1,.55)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.32);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  function tilt() {
    if (!finePointer || reduce || !hasGsap) return;
    $$('.tilt').forEach((el) => {
      const max = el.classList.contains('card') ? 7 : 9;
      gsap.set(el, { transformPerspective: 900 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointerenter', () => el.classList.add('is-hover'));
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ry((px - 0.5) * 2 * max);
        rx(-(py - 0.5) * 2 * max);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); el.classList.remove('is-hover'); });
    });
  }

  /* ───────── carrousel d'avis ───────── */
  function reviews() {
    const rv = $('#rv'), track = $('#rv-track');
    if (!rv || !track) return;
    const cards = $$('.rv__card', track);
    const bar = $('.rv__bar i');
    const n = cards.length;
    const anim = hasGsap;
    let idx = 0, hover = false, dragging = false, visible = false, timer = 0;

    const targetX = (i) => rv.clientWidth / 2 - (cards[i].offsetLeft + cards[i].offsetWidth / 2);
    const dur = (d) => (reduce ? 0 : d);

    function render(i, instant) {
      idx = Math.max(0, Math.min(n - 1, i));
      const d0 = instant ? 0 : dur(1.1);
      if (anim) {
        gsap.to(track, { x: targetX(idx), duration: d0, ease: 'expo.out', overwrite: 'auto' });
        cards.forEach((c, k) => {
          const d = k - idx;
          gsap.to(c, {
            scale: d === 0 ? 1 : 0.9,
            opacity: d === 0 ? 1 : Math.abs(d) > 2 ? 0.18 : 0.5,
            rotationY: d * -7,
            z: d === 0 ? 0 : -70,
            duration: instant ? 0 : dur(1),
            ease: 'expo.out',
            overwrite: 'auto'
          });
        });
        gsap.to(bar, { scaleX: (idx + 1) / n, duration: dur(0.8), ease: 'expo.out' });
      } else {
        track.style.transform = `translateX(${targetX(idx)}px)`;
      }
    }

    const next = () => render(idx + 1 >= n ? 0 : idx + 1);
    const startAuto = () => {
      clearInterval(timer);
      if (reduce) return;
      timer = setInterval(() => { if (!hover && !dragging && visible) next(); }, 6200);
    };

    $('#rv-prev').addEventListener('click', () => { render(idx - 1); startAuto(); });
    $('#rv-next').addEventListener('click', () => { render(idx + 1); startAuto(); });
    rv.addEventListener('pointerenter', () => { hover = true; });
    rv.addEventListener('pointerleave', () => { hover = false; });

    let startX = 0, baseX = 0, moved = 0;
    rv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true; startX = e.clientX; moved = 0;
      baseX = anim ? gsap.getProperty(track, 'x') : 0;
      rv.classList.add('is-drag');
    });
    addEventListener('pointermove', (e) => {
      if (!dragging || !anim) return;
      moved = e.clientX - startX;
      gsap.set(track, { x: baseX + moved });
    });
    const release = () => {
      if (!dragging) return;
      dragging = false;
      rv.classList.remove('is-drag');
      render(Math.abs(moved) > 50 ? idx + (moved < 0 ? 1 : -1) : idx);
      startAuto();
    };
    addEventListener('pointerup', release);
    addEventListener('pointercancel', release);
    addEventListener('resize', () => render(idx, true));

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0.25 }).observe(rv);
    } else {
      visible = true;
    }
    render(0, true);
    startAuto();
    document.fonts && document.fonts.ready.then(() => render(idx, true));
  }

  /* ═════ si GSAP est absent, le site reste lisible (pas de mouvement) ═════ */
  function basics() {
    openingStatus();
    composer();
    lightbox();
    menu();
    anchors();
    videos();
    reviews();
  }

  if (!hasGsap || reduce) {
    $('#loader') && $('#loader').remove();
    document.documentElement.classList.add('is-static');
    basics();
    return;
  }

  /* ═══════════════════════════════════════════════════════════
     MOTION
     ═══════════════════════════════════════════════════════════ */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* Lenis : défilement doux avec inertie, synchronisé avec ScrollTrigger */
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  basics();
  const flakes = petals();
  cursor();
  magnetic();
  tilt();

  /* états de départ (le préchargeur cache tout pendant la mise en place) */
  const heroTitle = $('.hero__title');
  const heroChars = split(heroTitle, { chars: true });
  gsap.set(heroChars, { yPercent: 120 });
  gsap.set(['.hero__kicker', '.hero__lead', '.hero__cta', '.hero__chips li', '.hero__scroll', '.nav'], { autoAlpha: 0 });
  gsap.set('.hc__in', { autoAlpha: 0, scale: 0.6, rotation: -8 });
  gsap.set('.dock', { y: 140, autoAlpha: 0 });

  const splitHeads = $$('[data-split]').map((h) => ({ h, words: split(h) }));
  splitHeads.forEach(({ words }) => gsap.set(words, { yPercent: 112 }));
  const footerChars = split($('.footer__giant'), { chars: true });
  gsap.set(footerChars, { yPercent: 108 });

  const revealSel = [
    '.stats__head .eyebrow', '.stats__note', '.composer__intro .eyebrow', '.composer__sub', '.composer fieldset',
    '.gallery__head .eyebrow', '.gallery__sub', '.salon__text .eyebrow', '.salon__text > p', '.salon__quote', '.badges li',
    '.reviews__head .eyebrow', '.reviews__scores li', '.rv__ctrl', '.reviews__more',
    '.book .eyebrow', '.book__alts li', '.find__info .eyebrow', '.find address', '.status', '.hours', '.find__btns',
    '.find__map', '.footer__top > div'
  ];
  const revealEls = $$(revealSel.join(','));
  gsap.set(revealEls, { y: 44, autoAlpha: 0 });

  /* ───── préchargeur ───── */
  const heroVideo = $('#hero-video');
  const heroReady = new Promise((res) => {
    if (!heroVideo.src || heroVideo.readyState >= 3) return res();
    heroVideo.addEventListener('canplay', res, { once: true });
    setTimeout(res, 4500);
  });
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  /* la fleur du rideau est pilotée à la main (attribut transform) pour un centrage exact */
  const hole = $('#loader-hole-flower');
  const holeState = { s: 0, r: 0 };
  const drawHole = () => hole.setAttribute('transform', `translate(50 50) rotate(${holeState.r}) scale(${holeState.s})`);
  drawHole();

  const counter = { v: 0 };
  const num = $('#loader-num');
  const intro = gsap.timeline();
  intro
    .to('.lp', { strokeDashoffset: 0, duration: 1.6, stagger: 0.16, ease: 'power2.inOut' }, 0)
    .to('.lc', { attr: { r: 1.1 }, duration: 0.7, ease: 'back.out(2.4)' }, 1.4);
  const count = gsap.to(counter, { v: 100, duration: 2.5, ease: 'power2.inOut', onUpdate: () => { num.textContent = Math.round(counter.v); } });
  const minTime = new Promise((res) => count.eventCallback('onComplete', res));

  Promise.all([minTime, heroReady, fontsReady]).then(() => {
    gsap.timeline({ onComplete: finishLoader })
      .to('.loader__ui', { autoAlpha: 0, scale: 0.92, duration: 0.55, ease: 'power2.in' })
      .to(holeState, { s: 16, r: 110, duration: 1.7, ease: 'expo.inOut', onUpdate: drawHole }, '-=0.25')
      .add(playHero, '-=1.15');
  });

  function finishLoader() {
    const l = $('#loader');
    if (l) l.remove();
    if (lenis) lenis.start();
    ScrollTrigger.refresh();
  }

  function playHero() {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__video', { scale: 1.28 }, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
      .fromTo('.hero__kicker', { y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.25)
      .to(heroChars, { yPercent: 0, duration: 1.6, stagger: 0.05 }, 0.15)
      .fromTo('.hero__lead', { y: 26 }, { autoAlpha: 1, y: 0, duration: 1.2 }, 0.8)
      .fromTo('.hero__cta', { y: 26 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.9)
      .to('.hc__in', { autoAlpha: 1, scale: 1, rotation: 0, duration: 1.8, stagger: 0.16 }, 0.35)
      .to('.hero__chips li', { autoAlpha: 1, duration: 0.9, stagger: 0.08 }, 1.1)
      .to(['.hero__scroll', '.nav'], { autoAlpha: 1, duration: 1 }, 1.2)
      .add(() => {
        /* respiration lente de la vidéo (effet Ken Burns) */
        gsap.to('.hero__video', { scale: 1.07, duration: 22, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }, 2.6);
  }

  /* ───── barre de progression, menu qui se cache, dock mobile ───── */
  gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.2 } });

  const nav = $('#nav');
  const dock = $('#dock');
  let dockOn = false;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      nav.classList.toggle('is-solid', y > 60);
      if (!menuIsOpen) {
        if (y > 420 && self.direction === 1) nav.classList.add('is-hidden');
        else if (self.direction === -1 || y < 420) nav.classList.remove('is-hidden');
      }
      const showDock = y > innerHeight * 0.55;
      if (showDock !== dockOn) {
        dockOn = showDock;
        gsap.to(dock, { y: showDock ? 0 : 140, autoAlpha: showDock ? 1 : 0, duration: 0.7, ease: 'expo.out', overwrite: true });
      }
      if (flakes) flakes.gust(self.getVelocity() / 650);
    }
  });

  /* ───── hero : parallax multicouche + souris ───── */
  gsap.to('.hero__video', { yPercent: 14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__bloom', { rotation: 70, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__inner', { y: -70, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  $$('.hc').forEach((c) => {
    gsap.to($('.hc__in', c), { y: Number(c.dataset.speed) * 320, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  });
  if (finePointer) {
    const layers = $$('.hero [data-depth]').map((el) => ({
      d: Number(el.dataset.depth),
      x: gsap.quickTo(el, 'x', { duration: 1.2, ease: 'power3' }),
      y: gsap.quickTo(el, 'y', { duration: 1.2, ease: 'power3' })
    }));
    $('.hero').addEventListener('pointermove', (e) => {
      const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { l.x(-nx * l.d); l.y(-ny * l.d); });
    });
  }

  /* ───── bandeau défilant : vitesse et sens liés au scroll ───── */
  (() => {
    const track = $('.marquee__track');
    const group = $('.marquee__group');
    track.appendChild(group.cloneNode(true));
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
    const band = $('.marquee');
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const v = self.getVelocity();
        const dir = self.direction;
        gsap.to(loop, { timeScale: dir * (1 + Math.min(Math.abs(v) / 220, 7)), duration: 0.25, overwrite: true, onComplete: () => gsap.to(loop, { timeScale: dir, duration: 1.2 }) });
        gsap.to(band, { skewX: Math.max(-6, Math.min(6, -v / 450)), duration: 0.4, overwrite: 'auto', onComplete: () => gsap.to(band, { skewX: 0, duration: 0.8, ease: 'power3.out' }) });
      }
    });
  })();

  /* ───── titres : mots qui montent derrière un masque ───── */
  splitHeads.forEach(({ h, words }) => {
    ScrollTrigger.create({
      trigger: h,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.4, stagger: 0.07, ease: 'expo.out' })
    });
  });

  /* ───── apparitions groupées ───── */
  ScrollTrigger.batch(revealEls, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { y: 0, autoAlpha: 1, duration: 1.2, stagger: 0.09, ease: 'expo.out', overwrite: true })
  });

  /* ───── chiffres clés : compteurs + anneaux qui se tracent ───── */
  $$('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const dec = Number(el.dataset.decimals || 0);
    const obj = { v: 0 };
    const fmt = (v) => v.toFixed(dec).replace('.', ',');
    el.textContent = fmt(0);
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => gsap.to(obj, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(obj.v); } })
    });
  });
  gsap.to('.stat__arc', { strokeDashoffset: 0, duration: 2.2, stagger: 0.18, ease: 'power3.inOut', scrollTrigger: { trigger: '.stats__grid', start: 'top 82%', once: true } });
  gsap.from('.stat', { y: 70, autoAlpha: 0, duration: 1.3, stagger: 0.14, ease: 'expo.out', scrollTrigger: { trigger: '.stats__grid', start: 'top 85%', once: true } });

  /* ───── galerie : parallax des colonnes + parallax dans les cadres ───── */
  $$('.g-item').forEach((it) => { it.dataset.cursor = 'Voir'; });
  $$('.g-item').forEach((it) => {
    gsap.from(it, { y: 90, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: it, start: 'top 92%', once: true } });
    const img = $('img', it);
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: it, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ───── le salon : image qui s'ouvre en cercle ───── */
  (() => {
    const main = $('.salon__main');
    gsap.fromTo(main, { clipPath: 'circle(0% at 50% 62%)' }, { clipPath: 'circle(88% at 50% 62%)', duration: 2, ease: 'power3.inOut', scrollTrigger: { trigger: main, start: 'top 78%', once: true } });
    gsap.fromTo($('img', main), { scale: 1.35, yPercent: -4 }, { scale: 1.02, yPercent: 4, ease: 'none', scrollTrigger: { trigger: main, start: 'top bottom', end: 'bottom top', scrub: true } });
    $$('.salon__float').forEach((f) => {
      gsap.from(f, { scale: 0.5, autoAlpha: 0, rotation: -10, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 92%', once: true } });
      gsap.to(f, { y: Number(f.dataset.speed) * 160, ease: 'none', scrollTrigger: { trigger: '.salon__grid', start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  })();

  /* ───── réserver : le bouton-sceau, la vidéo ───── */
  gsap.from('.seal', { scale: 0.4, rotation: -90, autoAlpha: 0, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: '.book__cta', start: 'top 85%', once: true } });
  gsap.fromTo('.book__video', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.book', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ───── pied de page : le grand mot qui se lève ───── */
  gsap.to(footerChars, { yPercent: 0, duration: 1.6, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: '.footer__giant', start: 'top 94%', once: true } });

  /* ═════ sections qui changent de mise en scène selon l'écran ═════ */
  const mm = gsap.matchMedia();

  mm.add(DESKTOP, () => {
    /* — savoir-faire : section pinnée, 4 étapes pilotées par le scroll — */
    const steps = $$('.story .step');
    const wraps = $$('.story .s-img');
    const imgs = wraps.map((w) => $('img', w));
    const nums = $$('.story__num span');
    const rings = $$('.story__ring');
    const tints = ['#FBF3EE', '#FAE7EB', '#F8DCE3', '#F6D3DD'];

    gsap.set(steps.slice(1), { autoAlpha: 0, y: 70 });
    gsap.set(wraps.slice(1), { yPercent: 100 });
    gsap.set(imgs.slice(1), { yPercent: -100 });

    const STEP = 1.7, HOLD = 0.9;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.story__pin', start: 'top top', end: '+=330%', pin: true, scrub: 0.8, anticipatePin: 1 }
    });
    for (let i = 1; i < steps.length; i++) {
      const t = HOLD + (i - 1) * STEP;
      tl.to(steps[i - 1], { autoAlpha: 0, y: -70, duration: 0.55, ease: 'power2.in' }, t)
        .to(steps[i], { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' }, t + 0.4)
        .to(wraps[i], { yPercent: 0, duration: 1, ease: 'power2.inOut' }, t)
        .to(imgs[i], { yPercent: 0, duration: 1, ease: 'power2.inOut' }, t)
        .to(imgs[i - 1], { scale: 1.18, duration: 1, ease: 'power2.inOut' }, t)
        .to(nums, { yPercent: -100 * i, duration: 0.6, ease: 'power3.inOut' }, t + 0.2)
        .to('.story__pin', { backgroundColor: tints[i], duration: 1 }, t)
        .to(rings, { rotation: `+=${i % 2 ? 14 : -10}`, duration: 1.4, ease: 'power2.inOut' }, t);
    }
    tl.to({}, { duration: HOLD * 0.6 });
    tl.fromTo('.story__bar i', { scaleX: 0 }, { scaleX: 1, duration: tl.duration(), ease: 'none' }, 0);

    /* — prestations : défilement horizontal piloté par le scroll vertical — */
    const track = $('.hs__track');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    const slide = gsap.to(track, {
      x: () => -dist(),
      ease: 'none',
      scrollTrigger: { trigger: '.hs__pin', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.9, invalidateOnRefresh: true, anticipatePin: 1 }
    });
    gsap.to('.hs__progress i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.hs__pin', start: 'top top', end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true } });
    gsap.to('.hs__kanji', { x: () => dist() * 0.16, ease: 'none', scrollTrigger: { trigger: '.hs__pin', start: 'top top', end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true } });
    $$('.hs .card').forEach((card) => {
      const st = { trigger: card, containerAnimation: slide, start: 'left 88%', once: true };
      gsap.from($$('.plist li', card), { x: 46, autoAlpha: 0, duration: 1, stagger: 0.06, ease: 'expo.out', scrollTrigger: st });
      gsap.from($('.card__photo', card), { scale: 0.5, rotation: -12, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: st });
      gsap.from($('.card__head', card), { y: 30, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: st });
    });
  });

  mm.add(MOBILE, () => {
    /* version douce : apparitions simples, tout reste lisible */
    $$('.step').forEach((s) => {
      gsap.from(s, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 88%', once: true } });
    });
    $$('.hs .card, .hs__intro, .hs__end').forEach((c) => {
      gsap.from(c, { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } });
    });
  });

  /* ───── liens d'ancre et rafraîchissement après chargement ───── */
  ScrollTrigger.refresh();
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => ScrollTrigger.refresh());
})();
