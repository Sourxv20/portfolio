document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  /* =====================================================
     HELPERS
  ===================================================== */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* =====================================================
     SMOOTH SCROLL (Lenis, optional)
  ===================================================== */
  let lenis = null;
  if (window.Lenis && !reduce) {
    try {
      lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    } catch (err) { lenis = null; }
  }
  const stopScroll  = () => { if (lenis) lenis.stop(); };
  const startScroll = () => { if (lenis) lenis.start(); };

  function scrollToEl(target) {
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }

  /* =====================================================
     SPLIT TEXT (word-by-word masked reveal)
  ===================================================== */
  function splitText(el) {
    el.setAttribute('aria-label', el.textContent.trim().replace(/\s+/g, ' '));
    let idx = 0;
    const walk = (node, cls) => {
      const frag = document.createDocumentFragment();
      node.childNodes.forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const wi = document.createElement('span'); wi.className = 'wi' + (cls ? ' ' + cls : '');
            wi.style.setProperty('--i', idx++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          frag.appendChild(walk(n, n.className || cls));
        }
      });
      return frag;
    };
    el.replaceChildren(walk(el, ''));
  }
  $$('.split').forEach(splitText);

  /* =====================================================
     REVEAL ON SCROLL + STAGGER + COUNT-UP
  ===================================================== */
  $$('[data-stagger]').forEach(group => {
    Array.from(group.children).forEach((c, i) => c.style.setProperty('--d', ((i % 4) * 0.09).toFixed(2) + 's'));
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .split').forEach(el => { if (el.id !== 'tagline') io.observe(el); });

  function countUp(el) {
    const to = parseFloat(el.dataset.count), from = parseFloat(el.dataset.from || 0), dec = parseInt(el.dataset.decimals || 0, 10);
    if (reduce) { el.textContent = to.toFixed(dec); return; }
    const t0 = performance.now(), dur = 1700;
    const step = now => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (from + (to - from) * e).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); countIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  // Fail-safe: never leave headings hidden
  setTimeout(() => $$('.split').forEach(el => el.classList.add('in')), 7000);

  /* =====================================================
     PRELOADER → HERO INTRO
  ===================================================== */
  const pre = $('#preloader'), preNum = $('#preNum'), preBar = $('#preBar');
  let pageLoaded = document.readyState === 'complete';
  window.addEventListener('load', () => { pageLoaded = true; });
  let introDone = false;

  function startIntro() {
    if (introDone) return; introDone = true;
    pre.classList.add('done');
    root.classList.remove('loading');
    root.classList.add('loaded');
    startScroll();
    setTimeout(() => { $('#tagline').classList.add('in'); startTyping(); }, reduce ? 0 : 450);
    setTimeout(() => { pre.style.display = 'none'; }, 1200);
  }
  stopScroll();
  if (reduce) { startIntro(); }
  else {
    const t0 = performance.now(), minMs = 1500;
    (function preTick(now) {
      let p = clamp((now - t0) / minMs, 0, 1);
      if (!pageLoaded) p = Math.min(p, 0.92);
      const eased = 1 - Math.pow(1 - p, 3);
      preNum.textContent = Math.round(eased * 100);
      preBar.style.transform = 'scaleX(' + eased + ')';
      if (p >= 1 && pageLoaded) { setTimeout(startIntro, 150); return; }
      requestAnimationFrame(preTick);
    })(performance.now());
    setTimeout(startIntro, 5000); // fail-safe
  }

  /* =====================================================
     TYPEWRITER ROLE LINE
  ===================================================== */
  const typedEl = $('#typed');
  const roles = ['Full-Stack Developer', 'DSA Problem Solver', 'AI Application Builder', 'C++ & Python Programmer'];
  let ri = 0, ci = 0, deleting = false, typing = false;
  function startTyping() {
    if (typing) return; typing = true;
    if (reduce) { typedEl.textContent = roles[0]; return; }
    (function type() {
      const w = roles[ri];
      if (!deleting) {
        ci++; typedEl.textContent = w.slice(0, ci);
        if (ci === w.length) { deleting = true; return setTimeout(type, 1700); }
        return setTimeout(type, 75);
      }
      ci--; typedEl.textContent = w.slice(0, ci);
      if (ci === 0) { deleting = false; ri = (ri + 1) % roles.length; return setTimeout(type, 350); }
      setTimeout(type, 38);
    })();
  }

  /* =====================================================
     CUSTOM CURSOR + GLOW
  ===================================================== */
  const dot = $('#cDot'), ring = $('#cRing'), ringLabel = $('span', ring), glow = $('#cursorGlow');
  const useCursor = finePointer && !reduce;
  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, gx = mx, gy = my;

  if (useCursor) {
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY;
      if (!root.classList.contains('has-cursor')) { rx = mx; ry = my; gx = mx; gy = my; root.classList.add('has-cursor'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => root.classList.remove('has-cursor'));
    document.addEventListener('mousedown', () => ring.classList.add('down'));
    document.addEventListener('mouseup', () => ring.classList.remove('down'));
    document.addEventListener('mouseover', e => {
      const lab = e.target.closest && e.target.closest('[data-cursor]');
      if (lab) { ring.classList.add('label'); ring.classList.remove('hover'); ringLabel.textContent = lab.dataset.cursor; return; }
      ring.classList.remove('label'); ringLabel.textContent = '';
      ring.classList.toggle('hover', !!(e.target.closest && e.target.closest('a, button, .chip')));
    });
  }

  /* =====================================================
     SPOTLIGHT (cards follow the pointer)
  ===================================================== */
  if (finePointer) {
    document.addEventListener('pointermove', e => {
      const t = e.target.closest && e.target.closest('.spot');
      if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* =====================================================
     3D TILT
  ===================================================== */
  if (finePointer && !reduce) {
    $$('[data-tilt]').forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 6;
      el.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = 'perspective(900px) rotateX(' + ((0.5 - py) * max).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * max).toFixed(2) + 'deg) scale(1.015)';
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* =====================================================
     MAGNETIC BUTTONS
  ===================================================== */
  if (finePointer && !reduce) {
    const mags = $$('[data-magnetic]');
    window.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mags.forEach(el => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const radius = Math.max(r.width, r.height) * 0.85;
        if (Math.hypot(dx, dy) < radius) { el.style.translate = (dx * 0.26).toFixed(1) + 'px ' + (dy * 0.26).toFixed(1) + 'px'; el._mag = true; }
        else if (el._mag) { el.style.translate = ''; el._mag = false; }
      });
    }, { passive: true });
    document.addEventListener('mouseleave', () => $$('[data-magnetic]').forEach(el => { el.style.translate = ''; }));
  }

  /* =====================================================
     HERO PARTICLE NETWORK
  ===================================================== */
  const net = $('#net'), nctx = net.getContext('2d');
  let W = 0, H = 0, pts = [], netVisible = true;
  const mouse = { x: -9999, y: -9999, on: false };

  function sizeNet() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = net.clientWidth, h = net.clientHeight;
    const rebuild = Math.abs(w - W) > 0 || Math.abs(h - H) > 120 || !pts.length;
    W = w; H = h;
    net.width = W * dpr; net.height = H * dpr;
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (rebuild) {
      const n = clamp(Math.floor(W * H / 14000), 26, 110);
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.4 + 0.5
      }));
    }
    if (reduce) drawNet(true);
  }
  function drawNet(still) {
    nctx.clearRect(0, 0, W, H);
    const link = 125, md = 170, link2 = link * link, md2 = md * md;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!still) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) { p.vx *= -1; p.x = clamp(p.x, 0, W); }
        if (p.y < 0 || p.y > H) { p.vy *= -1; p.y = clamp(p.y, 0, H); }
        if (mouse.on) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < md2 && d2 > 1) { const d = Math.sqrt(d2), f = (1 - d / md) * 0.6; p.x += dx / d * f; p.y += dy / d * f; }
        }
      }
      nctx.beginPath(); nctx.arc(p.x, p.y, p.r, 0, 6.2832); nctx.fillStyle = 'rgba(247,212,147,.75)'; nctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 < link2) {
          nctx.strokeStyle = 'rgba(95,208,224,' + ((1 - Math.sqrt(d2) / link) * 0.28).toFixed(3) + ')';
          nctx.lineWidth = 1; nctx.beginPath(); nctx.moveTo(p.x, p.y); nctx.lineTo(q.x, q.y); nctx.stroke();
        }
      }
      if (mouse.on && !still) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < md2) {
          nctx.strokeStyle = 'rgba(242,185,92,' + ((1 - Math.sqrt(d2) / md) * 0.55).toFixed(3) + ')';
          nctx.lineWidth = 1; nctx.beginPath(); nctx.moveTo(p.x, p.y); nctx.lineTo(mouse.x, mouse.y); nctx.stroke();
        }
      }
    }
  }
  sizeNet();
  let rsT; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { sizeNet(); measure(); }, 150); });
  new IntersectionObserver(([e]) => { netVisible = e.isIntersecting; }).observe($('.hero'));
  if (!reduce) {
    window.addEventListener('pointermove', e => {
      if (!netVisible || e.pointerType !== 'mouse') return;
      const r = net.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      mouse.on = mouse.y >= 0 && mouse.y <= r.height;
    }, { passive: true });
    document.addEventListener('mouseleave', () => { mouse.on = false; });
  }

  /* =====================================================
     MARQUEES (speed + direction react to scroll)
  ===================================================== */
  const marquees = reduce ? [] : $$('[data-marquee]').map(el => {
    const track = $('.marquee-track', el);
    const original = track.innerHTML;
    const unit = track.scrollWidth || 1;
    const copies = Math.ceil((innerWidth * 2) / unit) + 1;
    track.innerHTML = original.repeat(copies);
    return { track, unit, x: 0, base: parseFloat(el.dataset.marquee) || 0.7, dir: el.dataset.dir === 'right' ? 1 : -1 };
  });
  let flip = 1;
  function marqueeFrame(vel) {
    const target = vel > 0.6 ? 1 : vel < -0.6 ? -1 : flip;
    flip = lerp(flip, target, 0.06);
    marquees.forEach(m => {
      m.x += m.dir * flip * (m.base + Math.min(Math.abs(vel) * 0.35, 14));
      if (m.x <= -m.unit) m.x += m.unit;
      if (m.x > 0) m.x -= m.unit;
      m.track.style.transform = 'translate3d(' + m.x.toFixed(2) + 'px,0,0)';
    });
  }

  /* =====================================================
     SCROLL-DRIVEN: progress bar, nav, parallax, stack, timeline
  ===================================================== */
  const nav = $('#nav'), progress = $('#progress'), heroGrid = $('#heroGrid'), glowEl = $('.hero-glow');
  const stackItems = $$('.stack-item');
  const stackMQ = window.matchMedia('(min-width: 900px) and (min-height: 680px)');
  const STACK_BASE = 96, STACK_STEP = 24;
  const timeline = $('#timeline'), tlItems = $$('.tl-item');
  let maxScroll = 1, lastY = -1, prevY = window.scrollY, velocity = 0;

  function measure() { maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  measure();
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  window.addEventListener('load', measure);

  function updateStack() {
    if (!stackItems.length) return;
    const cards = stackItems.map(it => it.firstElementChild);
    if (!stackMQ.matches || reduce) { cards.forEach(c => { c.style.transform = ''; c.style.removeProperty('--dim'); }); return; }
    const vh = innerHeight;
    const arrive = stackItems.map((it, i) => {
      if (i === 0) return 0;
      const top = it.getBoundingClientRect().top;
      const stickyTop = STACK_BASE + i * STACK_STEP;
      return clamp((vh - top) / (vh - stickyTop), 0, 1);
    });
    cards.forEach((c, i) => {
      let depth = 0;
      for (let j = i + 1; j < arrive.length; j++) depth += arrive[j];
      c.style.transform = 'scale(' + (1 - depth * 0.045).toFixed(4) + ')';
      c.style.setProperty('--dim', (depth * 0.2).toFixed(3));
    });
  }

  function updateTimeline() {
    const r = timeline.getBoundingClientRect(), vh = innerHeight;
    timeline.style.setProperty('--p', clamp((vh * 0.7 - r.top) / r.height, 0, 1).toFixed(3));
    tlItems.forEach(it => it.classList.toggle('active', it.getBoundingClientRect().top < vh * 0.7));
  }

  function onScroll(y) {
    progress.style.transform = 'scaleX(' + clamp(y / maxScroll, 0, 1).toFixed(4) + ')';
    nav.classList.toggle('scrolled', y > 24);
    if (!root.classList.contains('menu-open')) {
      if (y > 220 && y > lastY + 4) nav.classList.add('hide');
      else if (y < lastY - 4 || y < 220) nav.classList.remove('hide');
    }
    // hero parallax + fade
    const vh = innerHeight;
    if (y < vh * 1.3 && !reduce) {
      heroGrid.style.transform = 'translate3d(0,' + (y * 0.22).toFixed(1) + 'px,0)';
      heroGrid.style.opacity = clamp(1 - y / (vh * 0.85), 0, 1).toFixed(3);
      glowEl.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
    }
    updateStack();
    updateTimeline();
  }

  /* =====================================================
     MAIN LOOP
  ===================================================== */
  function frame(time) {
    if (lenis) lenis.raf(time);
    const y = window.scrollY;
    velocity = lerp(velocity, y - prevY, 0.12); prevY = y;
    if (y !== lastY) { onScroll(y); lastY = y; }
    if (useCursor) {
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
      gx = lerp(gx, mx, 0.06); gy = lerp(gy, my, 0.06);
      glow.style.transform = 'translate3d(' + gx.toFixed(1) + 'px,' + gy.toFixed(1) + 'px,0)';
    }
    if (!reduce) {
      if (netVisible && !document.hidden) drawNet(false);
      marqueeFrame(velocity);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* =====================================================
     NAVIGATION: anchors, active link, mobile menu
  ===================================================== */
  const burger = $('#burger'), mobileMenu = $('#mobileMenu');
  function closeMenu() {
    root.classList.remove('menu-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Open menu');
    if (!root.classList.contains('modal-open')) startScroll();
  }
  burger.addEventListener('click', () => {
    const open = root.classList.toggle('menu-open');
    burger.setAttribute('aria-expanded', String(open)); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.remove('hide');
    open ? stopScroll() : startScroll();
  });
  $$('[data-target]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    const wasOpen = root.classList.contains('menu-open');
    if (wasOpen) closeMenu();
    const target = document.getElementById(el.dataset.target);
    // wait one tick so Lenis is running again before scrolling
    setTimeout(() => scrollToEl(target), wasOpen ? 60 : 0);
  }));

  const navLinks = $$('.nav-links a[data-target]');
  const sectionIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle('active', a.dataset.target === e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['about', 'skills', 'coding', 'projects', 'education', 'certifications', 'contact'].forEach(id => { const s = document.getElementById(id); if (s) sectionIO.observe(s); });

  /* =====================================================
     CASE STUDIES (modal)
  ===================================================== */
  const caseStudies = {
    fittrack: {
      eyebrow: "Case Study · Fitness Platform",
      title: "FitTrack",
      tagline: "Train Smarter. Run Stronger. — gym workouts, real GPS running tracking and progress analytics in one dashboard.",
      link: "https://fittrack-pied-five.vercel.app",
      problem: [
        "Most fitness apps pick a side: they're built either for lifters or for runners, so anyone who does both ends up juggling separate apps and scattered data.",
        "When strength sessions and runs live in different places, it's hard to see real progress, which makes it harder to stay consistent and train with intent."
      ],
      approach: [
        "Built gym training and running as equal, first-class features rather than treating one as an add-on to the other.",
        "Used real GPS tracking for runs so distance and routes come from actual movement instead of manual entry.",
        "Added progress analytics so workouts and runs roll up into one clear view of how training is trending over time.",
        "Designed a mobile-first, dashboard-style interface that feels like an app and works comfortably on any screen size."
      ],
      architecture: [
        "Next.js web app powering the dashboard UI, workout logging and analytics views.",
        "Node.js/Express REST API for workouts, runs and user progress data.",
        "Browser geolocation (GPS) integration to capture run distance and route in real time.",
        "Deployed on Vercel for fast, always-on public access."
      ],
      tech: ["Next.js", "React", "Node.js", "Express", "REST APIs", "Geolocation API", "Vercel"],
      results: [
        { num: "2", label: "Training modes: gym + running" },
        { num: "GPS", label: "Real run tracking" },
        { num: "Analytics", label: "Progress insights" },
        { num: "Live", label: "Deployed on Vercel" }
      ]
    },
    swayamshield: {
      eyebrow: "Case Study · Healthcare Platform",
      title: "SwayamShield",
      tagline: "A login-free emergency healthcare platform connecting patients, doctors, hospitals and ambulances in real time.",
      link: "https://swayam-shield.vercel.app/",
      problem: [
        "In an emergency, people lose critical minutes creating accounts, searching for the nearest available ambulance, or trying to figure out which hospital has free beds.",
        "Hospitals, doctors and patients also had no single system to manage appointments, track resources (beds, ambulances, staff), and access digital health records — everything lived in silos or on paper."
      ],
      approach: [
        "Designed a login-free ambulance booking flow so a user in distress can request help within seconds — no signup friction at the moment it matters most.",
        "Broke the platform into four role-based experiences — patient, doctor, hospital, and admin — each with a dashboard scoped to exactly what that role needs.",
        "Layered in an AI-based symptom checker so patients get a preliminary read on urgency and next steps while help is on the way."
      ],
      architecture: [
        "Frontend built with React.js for dynamic, role-based dashboards and real-time UI updates.",
        "Node.js backend exposing REST APIs for bookings, appointments, resource tracking and health records.",
        "MySQL/PostgreSQL for structured data — users, appointments, hospital resources, and health record history.",
        "A geolocation + distance-calculation service to match the nearest available ambulance and compute live ETA.",
        "A separate AI service layer for the symptom-checker, called asynchronously so it never blocks the emergency booking flow."
      ],
      tech: ["React.js", "Node.js", "MySQL", "PostgreSQL", "REST APIs", "Geolocation API", "AI/ML"],
      results: [
        { num: "4", label: "Role-based dashboards" },
        { num: "0", label: "Login steps to book" },
        { num: "Live", label: "Distance & ETA tracking" },
        { num: "AI", label: "Symptom pre-check" }
      ]
    },
    foodrescue: {
      eyebrow: "Case Study · Social Impact Platform",
      title: "Food Rescue App",
      tagline: "Connecting surplus food from restaurants and events to the people and NGOs who need it, before it goes to waste.",
      problem: [
        "Restaurants, event organizers and households routinely end up with surplus, still-good food and no fast way to get it to someone who needs it before it spoils.",
        "On the other side, NGOs and individuals looking for food donations have no real-time visibility into what's available nearby or when it can be picked up."
      ],
      approach: [
        "Built a real-time listings system so a donor can post surplus food with location, quantity and pickup window in under a minute.",
        "Designed role-based dashboards for donors, recipients/NGOs and admins so each side only sees what's relevant to them.",
        "Prioritized pickup coordination — matching nearby recipients to fresh listings quickly — over a heavier, browse-everything marketplace model."
      ],
      architecture: [
        "React.js frontend for donor and recipient dashboards with live listing updates.",
        "Node.js + REST API backend handling listings, claims, and pickup coordination logic.",
        "MySQL/PostgreSQL database storing listings, users, organizations and pickup history.",
        "Location-based filtering to surface the closest, most time-sensitive listings first."
      ],
      tech: ["React.js", "Node.js", "MySQL", "PostgreSQL", "REST APIs"],
      results: [
        { num: "3", label: "User roles supported" },
        { num: "Real-time", label: "Surplus food listings" },
        { num: "Local", label: "Pickup matching" }
      ]
    },
    voiceassistant: {
      eyebrow: "Case Study · AI / Speech",
      title: "AI Voice Assistant",
      tagline: "A hands-free, voice-driven assistant that understands natural language and responds in real time.",
      problem: [
        "Typing out every query or command is slow and often impractical — especially for quick tasks, accessibility needs, or hands-busy situations.",
        "Most simple voice tools only handle rigid, pre-set commands rather than genuinely understanding natural, conversational language."
      ],
      approach: [
        "Combined speech recognition with AI-powered natural language processing so the assistant understands intent, not just fixed keywords.",
        "Focused on real-time response — capturing speech, processing it, and replying with minimal lag to keep the interaction feeling natural.",
        "Built around a hands-free interaction model so the assistant could handle everyday queries and tasks without the user touching a screen."
      ],
      architecture: [
        "Speech-to-text layer to capture and transcribe user voice input.",
        "Python-based NLP/AI processing layer to interpret intent and generate a relevant response.",
        "Text-to-speech (or response) layer to deliver the answer back to the user in real time.",
        "Modular design so new query types/tasks can be added without reworking the core pipeline."
      ],
      tech: ["Python", "Speech Recognition", "Natural Language Processing", "AI"],
      results: [
        { num: "Real-time", label: "Query & response cycle" },
        { num: "Hands-free", label: "Interaction model" },
        { num: "NLP", label: "Powered understanding" }
      ]
    }
  };

  function renderCaseStudy(key) {
    const cs = caseStudies[key];
    if (!cs) return false;
    $('#csEyebrow').textContent = cs.eyebrow;
    $('#csTitle').textContent = cs.title;
    $('#csTagline').textContent = cs.tagline;
    const list = arr => '<ul>' + arr.map(i => '<li>' + i + '</li>').join('') + '</ul>';
    const chips = cs.tech.map(t => '<span class="chip">' + t + '</span>').join('');
    const results = cs.results.map(r => '<div class="cs-result-card"><div class="cs-result-num">' + r.num + '</div><div class="cs-result-label">' + r.label + '</div></div>').join('');
    const link = cs.link ? '<div class="cs-block cs-link-row" style="--k:5"><a class="live-btn" href="' + cs.link + '" target="_blank" rel="noopener"><span class="live-dot"></span>Visit live site ↗</a></div>' : '';
    const block = (k, n, title, inner) => '<div class="cs-block" style="--k:' + k + '"><div class="cs-block-label"><span class="cs-block-num">' + n + '</span><span class="cs-block-title">' + title + '</span></div>' + inner + '</div>';
    $('#csBody').innerHTML =
      block(0, 1, 'Problem', '<div class="cs-block-text">' + list(cs.problem) + '</div>') +
      block(1, 2, 'Approach', '<div class="cs-block-text">' + list(cs.approach) + '</div>') +
      block(2, 3, 'Architecture', '<div class="cs-block-text">' + list(cs.architecture) + '</div>') +
      block(3, 4, 'Tech Stack', '<div class="cs-tech-row">' + chips + '</div>') +
      block(4, 5, 'Results & Outcomes', '<div class="cs-result-grid">' + results + '</div>') +
      link;
    return true;
  }

  const modal = $('#caseModal'), modalClose = $('#modalClose');
  let lastFocus = null;
  function openModal(key, trigger) {
    if (!renderCaseStudy(key)) return;
    lastFocus = trigger;
    modal.scrollTop = 0;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    root.classList.add('modal-open');
    stopScroll();
    if (!lenis) document.body.style.overflow = 'hidden';
    setTimeout(() => modalClose.focus({ preventScroll: true }), 50);
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    root.classList.remove('modal-open');
    document.body.style.overflow = '';
    startScroll();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('.case-study-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.case, btn)));
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (modal.classList.contains('open')) closeModal(); else if (root.classList.contains('menu-open')) closeMenu(); }
  });

  /* =====================================================
     CONTACT EXTRAS: copy email, toast, clock, back to top
  ===================================================== */
  const toastEl = $('#toast');
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  $('#copyEmail').addEventListener('click', () => {
    const email = 'souravpandey21042006@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(() => toast('Email copied to clipboard'), () => toast('Could not copy — please select it manually'));
    } else { toast('Could not copy — please select it manually'); }
  });
  $('#toTop').addEventListener('click', () => {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  const clockEl = $('#clock');
  function tickClock() {
    try {
      const t = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date());
      clockEl.textContent = 'RANCHI · ' + t + ' IST';
    } catch (err) { clockEl.textContent = 'RANCHI, JHARKHAND'; }
  }
  tickClock(); setInterval(tickClock, 30000);
});