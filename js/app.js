/* Capas Studio 3D — напрям «Шари»: усе з'являється так, як друкує принтер, шар за шаром.
   Тексти й товари — js/data.js, фото — photos.json (складає tools/build_photos.py). */
gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText, Flip, Draggable, InertiaPlugin);

const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
const DESKTOP = matchMedia("(pointer: fine) and (min-width: 900px)").matches;
const LAYER = "steps(14)"; // «шаровий» крок для появи
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let lang = detectLang();
let PHOTOS = {};
let smoother = null;
let anim = null;      // контекст анімацій, що залежать від тексту (перебудовується при зміні мови)
let openId = null;

if (REDUCE) document.documentElement.classList.add("no-motion");

/* ---------- мова (як у NFC-меню) ---------- */
function detectLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q && SUPPORTED.includes(q)) return q;
  for (const l of (navigator.languages || [navigator.language || "es"])) {
    const code = l.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  }
  return "es";
}

function waLink(text) {
  if (!CONFIG.whatsapp) return "#";
  return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(text);
}

/* ---------- фото ---------- */
async function loadPhotos() {
  try {
    const r = await fetch("photos.json", { cache: "no-cache" });
    if (r.ok) PHOTOS = (await r.json()).products || {};
  } catch (e) { PHOTOS = {}; }
}
const photosOf = id => PHOTOS[id] || [];

function imgTag(p, alt, sizes, eager) {
  return `<img src="${p.src}" srcset="${p.srcset}" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${alt}"` +
    `${eager ? "" : ' loading="lazy"'} decoding="async">`;
}
function placeholder(name) {
  return `<div class="ph"><div class="ph-fill"></div><div class="ph-nozzle"></div>` +
    `<span class="ph-name">${name}</span><span class="ph-note">${UI[lang].soon}</span></div>`;
}

/* ---------- розмітка ---------- */
function renderModels() {
  const t = UI[lang];
  const total = String(MODELS.length).padStart(2, "0");
  $(".models-n").textContent = total;
  $("#grid").innerHTML = MODELS.map((m, i) => {
    const name = m.name[lang];
    const ph = photosOf(m.id);
    const media = ph.length ? imgTag(ph[0], t.alt + name, "(max-width: 700px) 80vw, 32vw") : placeholder(name);
    return `<article class="card" data-id="${m.id}">
      <button class="card-media" type="button" data-flip-id="m-${m.id}" aria-label="${t.view}: ${name}">${media}</button>
      <div class="card-info">
        <div class="card-top"><span class="idx">${String(i + 1).padStart(2, "0")} / ${total}</span>
          <button class="view-btn" type="button">${t.view}</button></div>
        <h3>${name}</h3>
        <ul class="facts-list">${m.facts[lang].map(f => `<li>${f}</li>`).join("")}</ul>
        <div class="card-row"><span class="price">${m.price} €</span>
          <a class="want clac wa" href="${waLink(t.msgItem(name, m.price))}">${t.want}</a></div>
      </div>
    </article>`;
  }).join("");
}

function applyLang() {
  if (anim) { anim.revert(); anim = null; }
  const t = UI[lang];
  document.documentElement.lang = lang;
  document.title = t.title;
  $('meta[name="description"]').content = t.desc;
  $$("[data-i]").forEach(el => { el.textContent = t[el.dataset.i]; });
  $$("[data-i-aria]").forEach(el => el.setAttribute("aria-label", t[el.dataset.iAria]));
  $$(".langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  $("#belt").textContent = t.belt.repeat(8);
  $$(".cta[data-msgkey]").forEach(a => { a.href = waLink(t[a.dataset.msgkey]); });
  renderModels();
  $$("a.wa").forEach(a => { if (CONFIG.whatsapp) { a.target = "_blank"; a.rel = "noopener"; } });
  if (CONFIG.instagram) {
    $("#ig").innerHTML = `Instagram: <a href="https://instagram.com/${CONFIG.instagram}" target="_blank" rel="noopener">@${CONFIG.instagram}</a>`;
  }
  paintSound();
  if (openId) fillPd(openId, false);
  buildAnims();
}

$$(".langs button").forEach(b => b.addEventListener("click", () => {
  if (b.dataset.lang === lang) return;
  lang = b.dataset.lang;
  const url = new URL(location.href);
  url.searchParams.set("lang", lang);
  history.replaceState(history.state, "", url);
  applyLang();
}));

/* ---------- анімації, що перебудовуються при зміні мови ---------- */
function buildAnims() {
  const track = $("#grid");
  track.classList.remove("native");
  if (REDUCE) { track.classList.add("native"); return; }

  anim = gsap.context(() => {
    // рядки тексту виїжджають з-під маски; ділимо на рядки, тож довгі слова не рвуться
    $$(".reveal-lines").filter(el => !el.closest(".hero")).forEach(el => {
      SplitText.create(el, {
        type: "lines", mask: "lines", autoSplit: true,
        onSplit: self => gsap.from(self.lines, {
          yPercent: 110, duration: 1.1, ease: "power4.out", stagger: 0.09,
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        })
      });
    });

    // маніфест: слова «друкуються» по мірі прокрутки
    SplitText.create(".manifesto", {
      type: "words", autoSplit: true,
      onSplit: self => gsap.fromTo(self.words, { opacity: 0.1 }, {
        opacity: 1, ease: "none", stagger: 0.1,
        scrollTrigger: { trigger: ".manifesto", start: "top 78%", end: "bottom 40%", scrub: true }
      })
    });

    // стрічка моделей: закріплюється і їде вбік; якщо секція не влазить в екран — звичайний свайп
    const models = $(".models");
    const hsBox = $(".hs");
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const fits = track.offsetHeight <= window.innerHeight * 0.96;
    const cards = $$(".card", track);
    gsap.from($$(".card-media", track), {
      clipPath: "inset(100% 0 0 0)", ease: LAYER, duration: 1, stagger: 0.12,
      scrollTrigger: { trigger: models, start: "top 65%", once: true }
    });
    gsap.from($$(".card-info", track), {
      y: 30, opacity: 0, duration: 0.9, ease: "power4.out", stagger: 0.12, delay: 0.3,
      scrollTrigger: { trigger: models, start: "top 65%", once: true }
    });
    if (fits && dist() > 0) {
      const skew = DESKTOP ? gsap.quickTo(cards, "skewX", { duration: 0.6, ease: "power3" }) : () => {};
      const hs = gsap.to(track, {
        x: () => -dist(), ease: "none",
        scrollTrigger: {
          trigger: hsBox, start: "center center", end: () => "+=" + dist(), pin: true, scrub: 0.8,
          anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => skew(gsap.utils.clamp(-4, 4, self.getVelocity() / -500)),
          onLeave: () => skew(0), onLeaveBack: () => skew(0)
        }
      });
      $$(".card-media img", track).forEach(img => {
        gsap.fromTo(img, { scale: 1.18 }, {
          scale: 1, ease: "none",
          scrollTrigger: { trigger: img.closest(".card"), containerAnimation: hs, start: "left right", end: "right left", scrub: true }
        });
      });
    } else {
      track.classList.add("native");
    }

    // кроки й факти: номери «друкуються» сходинкою
    gsap.from(".step b", {
      clipPath: "inset(100% 0 0 0)", ease: LAYER, duration: 0.9, stagger: 0.15,
      scrollTrigger: { trigger: ".steps", start: "top 80%", once: true }
    });
    gsap.from(".fact", {
      y: 40, opacity: 0, duration: 1, ease: "power4.out", stagger: 0.1,
      scrollTrigger: { trigger: ".facts", start: "top 85%", once: true }
    });

    // великий напис у футері — по літерах знизу
    SplitText.create(".ftr-big", {
      type: "words,chars", mask: "chars", autoSplit: true,
      onSplit: self => gsap.from(self.chars, {
        yPercent: 105, duration: 1, ease: "power4.out", stagger: 0.03,
        scrollTrigger: { trigger: ".ftr-big", start: "top 92%", once: true }
      })
    });
  });
  ScrollTrigger.refresh();
}

/* ---------- анімації, що створюються один раз ---------- */
function staticAnims() {
  if (REDUCE) return;
  // біжучий рядок, швидкість залежить від прокрутки
  const belt = gsap.to("#belt", { xPercent: -50, ease: "none", duration: 40, repeat: -1 });
  ScrollTrigger.create({
    trigger: ".belt", start: "top bottom", end: "bottom top",
    onUpdate: self => gsap.to(belt, { timeScale: 1 + Math.min(6, Math.abs(self.getVelocity()) / 300), duration: 0.2, overwrite: true,
      onComplete: () => gsap.to(belt, { timeScale: 1, duration: 1.2 }) })
  });
  // шапка ховається при прокрутці вниз
  const hdr = $(".hdr");
  ScrollTrigger.create({ start: 0, end: "max", onUpdate: s => hdr.classList.toggle("hide", s.direction === 1 && s.scroll() > 240 && !openId) });
}

/* ---------- прелоадер і поява першого екрана ---------- */
let heroSplit = null;
function prepareHero() {
  if (REDUCE) return;
  heroSplit = SplitText.create(".hero-title", { type: "chars", charsClass: "ch" });
  gsap.set(heroSplit.chars, { clipPath: "inset(100% 0 0 0)" });
  gsap.set([".hero-sub", ".hero-lead", ".hero-actions", ".scroll-hint"], { autoAlpha: 0, y: 24 });
}
function heroIntro() {
  if (REDUCE) return;
  gsap.timeline()
    .to(heroSplit.chars, { clipPath: "inset(0% 0 0 0)", ease: LAYER, duration: 1.1, stagger: 0.09 })
    .to(".hero-sub", { autoAlpha: 1, y: 0, duration: 0.9, ease: "power4.out" }, "-=0.5")
    .to(".hero-lead", { autoAlpha: 1, y: 0, duration: 0.9, ease: "power4.out" }, "-=0.7")
    .to([".hero-actions", ".scroll-hint"], { autoAlpha: 1, y: 0, duration: 0.9, ease: "power4.out", stagger: 0.1 }, "-=0.7");
}
function preloader() {
  return new Promise(resolve => {
    let seen = false;
    try { seen = sessionStorage.getItem("capas-pl") === "1"; } catch (e) {}
    if (REDUCE || seen) return resolve();
    try { sessionStorage.setItem("capas-pl", "1"); } catch (e) {}
    const pl = $(".preloader");
    const lines = $(".pl-lines");
    lines.innerHTML = "<i></i>".repeat(24);
    pl.classList.add("on");
    const count = { v: 0 };
    const out = $(".pl-count");
    gsap.timeline({ onComplete: () => { pl.remove(); resolve(); } })
      .to($$("i", lines), { scaleX: 1, duration: 0.5, ease: "power3.out", stagger: 0.035 }, 0)
      .to(count, { v: 240, duration: 1.6, ease: "power2.inOut", onUpdate: () => { out.textContent = String(Math.round(count.v)).padStart(3, "0"); } }, 0)
      .to(".pl-word", { clipPath: "inset(0% 0 0 0)", ease: "steps(24)", duration: 1.4 }, 0.15)
      .to(pl, { clipPath: "inset(0 0 100% 0)", duration: 0.9, ease: "power4.inOut" }, "+=0.15");
  });
}

/* ---------- сторінка товару ---------- */
const pd = $("#pd");
let drag = null;

function fillPd(id, flipReady) {
  const m = MODELS.find(x => x.id === id);
  const t = UI[lang];
  const name = m.name[lang];
  const ph = photosOf(id);
  const idx = MODELS.indexOf(m);
  $(".pd-idx", pd).textContent = `${String(idx + 1).padStart(2, "0")} / ${String(MODELS.length).padStart(2, "0")}`;
  $(".pd-name", pd).textContent = name;
  $(".pd-facts", pd).innerHTML = m.facts[lang].map(f => `<li>${f}</li>`).join("");
  $(".pd-price", pd).textContent = m.price + " €";
  const want = $(".pd-want", pd);
  want.textContent = t.want; want.href = waLink(t.msgItem(name, m.price));
  if (CONFIG.whatsapp) { want.target = "_blank"; want.rel = "noopener"; }
  if (flipReady === false) return;
  const track = $(".pd-track", pd);
  track.innerHTML = ph.length
    ? ph.map((p, i) => `<div class="pd-slide" style="aspect-ratio:${p.w}/${p.h}"${i === 0 ? ` data-flip-id="m-${id}"` : ""}>` +
        imgTag(p, t.alt + name, "(max-width: 1000px) 90vw, 60vw", i < 2) + `</div>`).join("")
    : `<div class="pd-slide single" style="aspect-ratio:5/4" data-flip-id="m-${id}">${placeholder(name)}</div>`;
  $(".pd-nav", pd).classList.toggle("hidden", ph.length < 2);
}

function setupGallery() {
  if (drag) { drag.kill(); drag = null; }
  const track = $(".pd-track", pd), view = $(".pd-viewport", pd);
  gsap.set(track, { x: 0 });
  const slides = $$(".pd-slide", track);
  const counter = $(".pd-count", pd);
  const stops = () => slides.map(s => -Math.min(s.offsetLeft, Math.max(0, track.scrollWidth - view.clientWidth)));
  const current = () => { const x = gsap.getProperty(track, "x"); const st = stops(); let best = 0;
    st.forEach((v, i) => { if (Math.abs(v - x) < Math.abs(st[best] - x)) best = i; }); return best; };
  const paint = () => { counter.textContent = `${current() + 1} / ${slides.length}`; };
  paint();
  if (slides.length < 2) return;
  const go = i => { const st = stops(); i = gsap.utils.clamp(0, st.length - 1, i);
    gsap.to(track, { x: st[i], duration: REDUCE ? 0 : 0.8, ease: "power4.out", onUpdate: paint }); };
  $(".pd-prev", pd).onclick = () => go(current() - 1);
  $(".pd-next", pd).onclick = () => go(current() + 1);
  drag = Draggable.create(track, {
    type: "x", inertia: true, edgeResistance: 0.85, cursor: "grab", activeCursor: "grabbing",
    bounds: { minX: -Math.max(0, track.scrollWidth - view.clientWidth), maxX: 0 },
    snap: x => { const st = stops(); return st.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a)); },
    onDrag: paint, onThrowUpdate: paint
  })[0];
}

function openPd(id, fromEl, push = true) {
  if (openId === id) return;
  openId = id;
  const state = fromEl && !REDUCE ? Flip.getState(fromEl) : null;
  fillPd(id);
  pd.hidden = false;
  document.body.classList.add("locked");
  if (smoother) smoother.paused(true);
  if (push) history.pushState({ pd: id }, "", "#" + id);
  setupGallery();
  $(".pd-close", pd).focus({ preventScroll: true });
  if (REDUCE) return;
  const first = $(".pd-slide", pd);
  gsap.fromTo(pd, { backgroundColor: "rgba(20,19,18,0)" }, { backgroundColor: "rgba(20,19,18,1)", duration: 0.5 });
  if (state) Flip.from(state, { targets: first, duration: 1, ease: "power4.inOut", absolute: true, zIndex: 5 });
  gsap.from([...$$(".pd-slide", pd).slice(1), ".pd-nav"], { x: 80, opacity: 0, duration: 1, ease: "power4.out", stagger: 0.08, delay: 0.35 });
  gsap.from([".pd-idx", ".pd-name", ".pd-facts li", ".pd-row", ".pd-close"], { y: 30, opacity: 0, duration: 0.9, ease: "power4.out", stagger: 0.06, delay: 0.45 });
}

function closePd() {
  if (!openId) return;
  const id = openId;
  openId = null;
  const done = () => {
    pd.hidden = true; gsap.set(pd, { clearProps: "clipPath,backgroundColor" });
    document.body.classList.remove("locked");
    if (smoother) smoother.paused(false);
    if (drag) { drag.kill(); drag = null; }
    const back = $(`.card[data-id="${id}"] .card-media`);
    if (back) back.focus({ preventScroll: true });
  };
  if (REDUCE) return done();
  gsap.to(pd, { clipPath: "inset(0 0 100% 0)", ease: "steps(16)", duration: 0.7, onComplete: done });
}
function closeFromUI() {
  if (history.state && history.state.pd) history.back();
  else { history.replaceState(null, "", location.pathname + location.search); closePd(); }
}

document.addEventListener("click", e => {
  const card = e.target.closest(".card-media, .view-btn");
  if (!card) return;
  const art = card.closest(".card");
  openPd(art.dataset.id, $(".card-media", art));
});
$(".pd-close", pd).addEventListener("click", closeFromUI);
document.addEventListener("keydown", e => { if (e.key === "Escape" && openId) closeFromUI(); });
window.addEventListener("popstate", e => {
  const id = e.state && e.state.pd;
  if (id) openPd(id, null, false); else closePd();
});

/* ---------- курсор ---------- */
function cursor() {
  const c = $(".cursor");
  if (!c || REDUCE || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const xTo = gsap.quickTo(c, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(c, "y", { duration: 0.35, ease: "power3" });
  const label = $(".cursor-label", c);
  window.addEventListener("pointermove", e => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
  document.addEventListener("pointerover", e => {
    const media = e.target.closest(".card-media");
    c.classList.toggle("big", !!media);
    if (media) label.textContent = UI[lang].view;
  });
}

/* ---------- звук «клац» ---------- */
let soundOn = true;
try { soundOn = localStorage.getItem("capas-sound") !== "off"; } catch (e) {}
const soundBtn = $("#sound");
function paintSound() {
  soundBtn.textContent = soundOn ? UI[lang].soundOn : UI[lang].soundOff;
  soundBtn.setAttribute("aria-pressed", String(soundOn));
}
let actx = null;
function clac() {
  if (!soundOn) return;
  actx = actx || new (window.AudioContext || window.webkitAudioContext)();
  const t = actx.currentTime;
  const len = Math.floor(actx.sampleRate * 0.03);
  const buf = actx.createBuffer(1, len, actx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6);
  const noise = actx.createBufferSource(); noise.buffer = buf;
  const hp = actx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
  const nGain = actx.createGain(); nGain.gain.value = 0.9;
  noise.connect(hp).connect(nGain).connect(actx.destination);
  const osc = actx.createOscillator(); const oGain = actx.createGain();
  osc.frequency.setValueAtTime(190, t); osc.frequency.exponentialRampToValueAtTime(55, t + 0.06);
  oGain.gain.setValueAtTime(0.6, t); oGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.connect(oGain).connect(actx.destination);
  noise.start(t); osc.start(t); osc.stop(t + 0.08);
}
document.addEventListener("pointerdown", e => {
  const el = e.target.closest(".clac, .card-media");
  if (!el) return;
  el.classList.add("down");
  clac();
});
const release = () => $$(".clac.down, .card-media.down").forEach(el => el.classList.remove("down"));
["pointerup", "pointercancel", "pointerleave"].forEach(ev => document.addEventListener(ev, release));
soundBtn.addEventListener("click", () => {
  soundOn = !soundOn;
  try { localStorage.setItem("capas-sound", soundOn ? "on" : "off"); } catch (e) {}
  paintSound();
});

/* ---------- старт ---------- */
(async function init() {
  if (!REDUCE && DESKTOP) {
    smoother = ScrollSmoother.create({ wrapper: "#smooth-wrapper", content: "#smooth-content", smooth: 1.15, effects: false, smoothTouch: false });
  }
  await loadPhotos();
  applyLang();
  prepareHero();
  staticAnims();
  cursor();
  await Promise.all([preloader(), document.fonts ? document.fonts.ready : null]);
  heroIntro();
  ScrollTrigger.refresh();
  const deep = location.hash.slice(1);
  if (MODELS.some(m => m.id === deep)) openPd(deep, null, false);
})();
