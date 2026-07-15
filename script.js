/* ================================================================
   SBGMUN 2026 — THE CLOSING ARGUMENT
   script.js — vanilla JS, no dependencies.

   Marks <html> as JS-capable immediately so style.css only hides
   content it can guarantee it will reveal (progressive enhancement:
   a no-script visit still shows every section, just unanimated).
   ================================================================ */
document.documentElement.classList.add('js');

(() => {
  'use strict';

  /* ============================================================
     0. CONFIG & UTILITIES
     ============================================================ */
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  const DESKTOP = !IS_TOUCH && FINE_POINTER;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp = (a, b, t) => a + (b - a) * t;
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  document.documentElement.classList.toggle('reduced-motion', REDUCED_MOTION);

  /* ============================================================
     1. SCROLL-REVEAL SYSTEM
     ============================================================ */
  function initScrollReveal() {
    const items = qsa('[data-reveal]');
    if (!items.length) return;

    // Stagger siblings that reveal together (e.g. everything inside
    // one .demon-text column) so they cascade rather than pop at once.
    const groups = new Map();
    items.forEach((el) => {
      const parent = el.parentElement;
      if (!groups.has(parent)) groups.set(parent, []);
      groups.get(parent).push(el);
    });
    groups.forEach((siblings) => {
      siblings.forEach((el, i) => {
        el.style.setProperty('--reveal-delay', `${Math.min(i * 90, 360)}ms`);
      });
    });

    if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => observer.observe(el));
  }

  /* ============================================================
     2. ACTIVE SECTION + HUD SEAL PROGRESS
     ============================================================ */
  function initSectionTracking() {
    const sections = qsa('[data-section]');
    const hud = qs('.hud');
    const heroSection = qs('#hero');
    const sealHud = qs('#seal-hud');
    const demonThemes = ['egotism', 'escalation', 'ignorance', 'silence'];
    const seenDemons = new Set();

    function updateSeal() {
      if (!sealHud) return;
      const progress = seenDemons.size / demonThemes.length;
      sealHud.style.setProperty('--progress', progress.toFixed(3));
      let label = 'Prophecy seal, four files unread';
      if (seenDemons.size === demonThemes.length) {
        label = 'Prophecy seal, all four files opened';
      } else if (seenDemons.size > 0) {
        label = `Prophecy seal, ${seenDemons.size} of 4 files opened`;
      }
      sealHud.setAttribute('aria-label', label);
    }
    updateSeal();

    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const theme = entry.target.dataset.theme;
          if (entry.isIntersecting && theme && demonThemes.includes(theme) && !seenDemons.has(theme)) {
            seenDemons.add(theme);
            updateSeal();
          }
        });
      }, { threshold: .4 });
      sections.forEach((s) => sectionObserver.observe(s));

      if (hud && heroSection) {
        const heroObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => hud.classList.toggle('is-visible', !entry.isIntersecting));
        }, { threshold: .15 });
        heroObserver.observe(heroSection);
      }
    }
  }

  /* ============================================================
     3. SCROLL PROGRESS BAR
     ============================================================ */
  function initScrollProgress() {
    const bar = qs('#scroll-bar');
    if (!bar) return;
    let ticking = false;

    function update() {
      const doc = document.documentElement;
      const scrollTop = doc.scrollTop || document.body.scrollTop;
      const height = (doc.scrollHeight - doc.clientHeight) || 1;
      bar.style.transform = `scaleY(${clamp(scrollTop / height, 0, 1)})`;
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ============================================================
     4. CUSTOM CURSOR (desktop, fine pointer only)
     ============================================================ */
  function initCustomCursor() {
    const rune = qs('#cursor-rune');
    const dot = qs('#cursor-dot');
    if (!rune || !dot) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let runeX = mouseX;
    let runeY = mouseY;
    let active = false;

    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!active) {
        active = true;
        rune.classList.add('is-active');
        dot.classList.add('is-active');
      }
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      rune.classList.remove('is-active');
      dot.classList.remove('is-active');
      active = false;
    });

    const hoverSelector = 'a, button, [role="button"], .magnetic, [data-parallax]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) rune.classList.add('is-hovering');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest && e.target.closest(hoverSelector)) rune.classList.remove('is-hovering');
    });

    function follow() {
      runeX = lerp(runeX, mouseX, .14);
      runeY = lerp(runeY, mouseY, .14);
      rune.style.transform = `translate(${runeX}px, ${runeY}px)`;
      requestAnimationFrame(follow);
    }
    requestAnimationFrame(follow);
  }

  /* ============================================================
     5. MOUSE SPOTLIGHT (vignette tracking)
     ============================================================ */
  function initMouseSpotlight() {
    const root = document.documentElement;
    let curX = window.innerWidth / 2;
    let curY = window.innerHeight / 2;
    let targetX = curX;
    let targetY = curY;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    }, { passive: true });

    function update() {
      curX = lerp(curX, targetX, .06);
      curY = lerp(curY, targetY, .06);
      root.style.setProperty('--spotlight-x', `${curX}px`);
      root.style.setProperty('--spotlight-y', `${curY}px`);
      requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  /* ============================================================
     6. MAGNETIC BUTTONS
     ============================================================ */
  function initMagneticButtons() {
    qsa('.magnetic').forEach((el) => {
      let targetX = 0, targetY = 0, curX = 0, curY = 0, rafId = null;
      const strength = .35;
      const maxDist = 14;

      function settle() {
        curX = lerp(curX, targetX, .18);
        curY = lerp(curY, targetY, .18);
        el.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px)`;
        if (Math.abs(curX - targetX) > .05 || Math.abs(curY - targetY) > .05) {
          rafId = requestAnimationFrame(settle);
        } else {
          rafId = null;
        }
      }
      function ensureLoop() { if (!rafId) rafId = requestAnimationFrame(settle); }

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const relX = e.clientX - (rect.left + rect.width / 2);
        const relY = e.clientY - (rect.top + rect.height / 2);
        targetX = clamp(relX * strength, -maxDist, maxDist);
        targetY = clamp(relY * strength, -maxDist, maxDist);
        ensureLoop();
      });
      el.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; ensureLoop(); });
    });
  }

  /* ============================================================
     7. HOVER GLOW (cursor-tracked card highlight)
     ============================================================ */
  function initHoverGlow() {
    qsa('.relic-frame, .timeline-node, #sound-toggle, #close-prophecy').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--hx', `${x.toFixed(1)}%`);
        el.style.setProperty('--hy', `${y.toFixed(1)}%`);
      });
    });
  }

  /* ============================================================
     8. RELIC FRAME TILT (parallax)
     ============================================================ */
  function initTiltParallax() {
    qsa('[data-parallax="tilt"]').forEach((frame) => {
      let targetX = 0, targetY = 0, curX = 0, curY = 0, rafId = null;

      function settle() {
        curX = lerp(curX, targetX, .12);
        curY = lerp(curY, targetY, .12);
        frame.style.setProperty('--tilt-x', `${curX.toFixed(2)}deg`);
        frame.style.setProperty('--tilt-y', `${curY.toFixed(2)}deg`);
        if (Math.abs(curX - targetX) > .02 || Math.abs(curY - targetY) > .02) {
          rafId = requestAnimationFrame(settle);
        } else {
          rafId = null;
        }
      }
      function ensureLoop() { if (!rafId) rafId = requestAnimationFrame(settle); }

      frame.addEventListener('mousemove', (e) => {
        const rect = frame.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        targetY = (px - .5) * 16;
        targetX = (.5 - py) * 11;
        ensureLoop();
      });
      frame.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; ensureLoop(); });
    });
  }

  /* ============================================================
     9. IMAGE LAZY-LOAD FADE
     ============================================================ */
  function initImageFade() {
    qsa('.relic-frame img').forEach((img) => {
      if (img.complete && img.naturalWidth) {
        img.classList.add('is-loaded');
      } else {
        img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
        img.addEventListener('error', () => img.classList.add('is-loaded'), { once: true });
      }
    });
  }

  /* ============================================================
     10. PARTICLE CANVAS — ash + dust
     ============================================================ */
  function initParticles() {
    const canvas = qs('#particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width, height, dpr;
    let particles = [];
    let rafId = null;
    let visible = true;
    let lastTime = performance.now();

    const COUNT = IS_TOUCH ? 24 : 46;
    const rand = (a, b) => a + Math.random() * (b - a);

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeParticle(spawnAtBottom) {
      const isAsh = Math.random() < .55;
      return {
        x: Math.random() * width,
        y: spawnAtBottom ? height + rand(0, 40) : Math.random() * height,
        r: isAsh ? rand(1.4, 3.2) : rand(.6, 1.6),
        speed: isAsh ? rand(10, 22) : rand(4, 12),
        drift: rand(-6, 6),
        driftSpeed: rand(.4, 1.1),
        phase: Math.random() * Math.PI * 2,
        opacity: isAsh ? rand(.18, .42) : rand(.08, .22),
        gold: isAsh,
      };
    }

    function initField() {
      particles = Array.from({ length: COUNT }, () => makeParticle(false));
    }

    function tick(now) {
      if (!visible) { rafId = null; return; }
      const dt = Math.min((now - lastTime) / 1000, .05);
      lastTime = now;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y -= p.speed * dt;
        p.x += Math.sin(now / 1000 * p.driftSpeed + p.phase) * p.drift * dt;
        if (p.y < -10) Object.assign(p, makeParticle(true));
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold
          ? `rgba(201,162,39,${p.opacity})`
          : `rgba(237,230,214,${p.opacity})`;
        ctx.fill();
      });

      rafId = requestAnimationFrame(tick);
    }

    function start() { if (!rafId) { lastTime = performance.now(); rafId = requestAnimationFrame(tick); } }
    function stop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

    resize();
    initField();
    start();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });
    document.addEventListener('visibilitychange', () => {
      visible = !document.hidden;
      if (visible) start(); else stop();
    });
  }

  /* ============================================================
     11. TIMELINE FILL (scroll-linked)
     ============================================================ */
  function initTimeline() {
    const section = qs('#trilogy');
    const fill = qs('.timeline-line-fill');
    if (!section || !fill) return;

    if (REDUCED_MOTION) {
      fill.style.transform = 'scale(1,1)';
      return;
    }

    let active = false;
    let ticking = false;

    function update() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const traveled = vh - rect.top;
      const progress = clamp(traveled / total, 0, 1);
      const isDesktop = window.innerWidth >= 900;
      fill.style.transform = isDesktop ? `scale(${progress},1)` : `scale(1,${progress})`;
      ticking = false;
    }
    function onScroll() {
      if (!active) return;
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        active = entries[0].isIntersecting;
        if (active) onScroll();
      }, { threshold: 0 });
      observer.observe(section);
    } else {
      active = true;
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ============================================================
     12. CLOSING SEQUENCE — stamp, bottom sentinel, toast
     ============================================================ */
  function initClosingSequence() {
    const sentinel = qs('#bottom-sentinel');
    const stamp = qs('#closing-stamp');
    const stampWord = qs('#stamp-word');
    const toast = qs('#bottom-toast');
    if (!sentinel) return;

    let triggered = false;

    function showToast() {
      if (!toast) return;
      toast.removeAttribute('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));
      window.setTimeout(hideToast, 6500);
    }
    function hideToast() {
      if (!toast || !toast.classList.contains('is-visible')) return;
      toast.classList.remove('is-visible');
      window.setTimeout(() => toast.setAttribute('hidden', ''), 650);
    }
    function runSequence() {
      if (stamp) {
        window.setTimeout(() => {
          stamp.classList.add('is-closed');
          if (stampWord) stampWord.textContent = 'CLOSED';
        }, REDUCED_MOTION ? 0 : 550);
      }
      window.setTimeout(showToast, REDUCED_MOTION ? 200 : 1400);
    }

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            runSequence();
            observer.disconnect();
          }
        });
      }, { threshold: .1 });
      observer.observe(sentinel);
    }
  }

  /* ============================================================
     13. SOUND TOGGLE — generative Web Audio ambience
          (no external file; never autoplays — only starts on click)
     ============================================================ */
  function initSoundToggle() {
    const btn = qs('#sound-toggle');
    if (!btn) return;

    let audioCtx = null;
    let masterGain = null;
    let playing = false;

    function buildAmbience() {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioCtx.destination);

      // Low detuned drone pad — an open, hollow chord.
      const freqs = [55, 82.4, 110];
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i === 1 ? 'triangle' : 'sine';
        osc.frequency.value = f;

        const gain = audioCtx.createGain();
        gain.gain.value = .34 / freqs.length;

        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start();

        // Slow LFO on the filter cutoff for a breathing texture.
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = .05 + i * .02;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 220;
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);
        lfo.start();
      });

      // Filtered noise — wind moving through the archive.
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'lowpass';
      noiseFilter.frequency.value = 320;

      const noiseGain = audioCtx.createGain();
      noiseGain.gain.value = .05;

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      noise.start();
    }

    function fadeTo(value, duration) {
      if (!audioCtx || !masterGain) return;
      const now = audioCtx.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(masterGain.gain.value, now);
      masterGain.gain.linearRampToValueAtTime(value, now + duration);
    }

    async function toggle() {
      try {
        if (!audioCtx) buildAmbience();
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        playing = !playing;
        btn.setAttribute('aria-pressed', String(playing));
        btn.setAttribute('aria-label', playing ? 'Disable ambient sound' : 'Enable ambient sound');
        fadeTo(playing ? .4 : 0, playing ? 2.2 : 1.2);
      } catch (err) {
        console.warn('Ambient audio unavailable:', err);
      }
    }

    btn.addEventListener('click', toggle);
  }

  /* ============================================================
     14. HIDDEN PROPHECY — Konami code easter egg
     ============================================================ */
  function initHiddenProphecy() {
    const overlay = qs('#hidden-prophecy');
    const closeBtn = qs('#close-prophecy');
    if (!overlay) return;

    const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    let idx = 0;

    function onEscape(e) { if (e.code === 'Escape') closeOverlay(); }

    function openOverlay() {
      overlay.removeAttribute('hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        overlay.classList.add('is-open');
        if (closeBtn) closeBtn.focus();
      }));
      document.addEventListener('keydown', onEscape);
    }
    function closeOverlay() {
      overlay.classList.remove('is-open');
      document.removeEventListener('keydown', onEscape);
      window.setTimeout(() => overlay.setAttribute('hidden', ''), 550);
    }

    window.addEventListener('keydown', (e) => {
      if (!overlay.hasAttribute('hidden')) return;
      idx = (e.code === code[idx]) ? idx + 1 : (e.code === code[0] ? 1 : 0);
      if (idx === code.length) {
        idx = 0;
        openOverlay();
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeOverlay);
  }

  /* ============================================================
     15. SIGIL DESYNC — organic, non-unison pulsing
     ============================================================ */
  function initSigilDesync() {
    qsa('.sigil-mount').forEach((el) => {
      el.style.animationDelay = `${(Math.random() * -4.5).toFixed(2)}s`;
    });
  }

  /* ============================================================
     15b. SCRAMBLE-DECODE TEXT — file names resolving out of noise,
          like a redacted line being decrypted. One-shot per element.
     ============================================================ */
  function initTextScramble() {
    const targets = qsa('[data-scramble]');
    if (!targets.length || REDUCED_MOTION || !('IntersectionObserver' in window)) return;

    const CHARS = '#%&01ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const TOTAL_FRAMES = 16;
    const FRAME_MS = 30;

    function scramble(el) {
      const final = el.textContent;
      const len = final.length;
      const lockedAt = Array.from({ length: len }, (_, i) =>
        Math.floor((i / Math.max(len - 1, 1)) * TOTAL_FRAMES * .55) + Math.floor(TOTAL_FRAMES * .3)
      );
      let frame = 0;

      function tick() {
        let out = '';
        for (let i = 0; i < len; i++) {
          const ch = final[i];
          out += (ch === ' ' || frame >= lockedAt[i]) ? ch : CHARS[Math.floor(Math.random() * CHARS.length)];
        }
        el.textContent = out;
        frame++;
        if (frame <= TOTAL_FRAMES) {
          window.setTimeout(tick, FRAME_MS);
        } else {
          el.textContent = final;
        }
      }
      tick();
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          scramble(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .4 });

    targets.forEach((el) => observer.observe(el));
  }

  /* ============================================================
     16. INIT
     ============================================================ */
  function init() {
    initScrollReveal();
    initSectionTracking();
    initScrollProgress();
    initImageFade();
    initTimeline();
    initClosingSequence();
    initSoundToggle();
    initHiddenProphecy();
    initSigilDesync();
    initTextScramble();

    if (DESKTOP) {
      initHoverGlow();
      if (!REDUCED_MOTION) {
        initCustomCursor();
        initMouseSpotlight();
        initTiltParallax();
        initMagneticButtons();
      }
    }
    if (!REDUCED_MOTION) initParticles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
