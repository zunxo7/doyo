(function () {
  "use strict";

  var root = document.documentElement;
  var isStatic = root.classList.contains("static") || !window.gsap || !window.ScrollTrigger;
  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };

  /* ---------------- The chat demo: its state is a pure function of how many items are shown ---------------- */
  var phone = $("#demo");
  var heroVisual = $(".hero-visual");
  var items = $$(".item", phone);
  var steps = $$("#steps li");
  var statusText = $("#statusText");
  var onIt = $("#onit");
  var booked = $("#booked");
  var paid = $("#paid");

  function renderChat(shown, typing) {
    var isShown = function (el) { return items.indexOf(el) < shown; };
    var best = "";
    var afterJob = isShown(paid);
    items.forEach(function (item, index) {
      var on = index < shown;
      item.classList.toggle("show", on);
      if (on && item.hasAttribute("data-best")) best = item.getAttribute("data-best");
    });

    var stage = "start";
    if (shown > 0) stage = "plan";
    if (isShown(onIt)) stage = "live";
    if (isShown(booked)) stage = "booked";
    if (afterJob) stage = "paid";
    phone.setAttribute("data-stage", stage);
    heroVisual.classList.toggle("is-booked", stage === "booked");
    phone.classList.toggle("is-typing", typing);
    statusText.textContent = best ? "Best so far · PKR " + best : "Negotiating";

    var step = shown ? Number(items[shown - 1].getAttribute("data-step")) : 1;
    if (typing && shown < items.length) step = Number(items[shown].getAttribute("data-step"));
    steps.forEach(function (item) {
      var n = Number(item.getAttribute("data-step"));
      item.classList.toggle("active", n === step);
      item.classList.toggle("done", n < step);
    });
  }

  if (isStatic) {
    renderChat(items.length - 1, false);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Demo: plays by itself, on a loop, while it is on screen ---------------- */
  var GAP_MS = 1000;
  var TYPING_MS = 800;
  var END_HOLD_MS = 3000;
  var shown = 0;
  var typing = false;
  var timer = null;
  var playing = false;

  function schedule(ms) {
    clearTimeout(timer);
    timer = playing ? setTimeout(tick, ms) : null;
  }

  function tick() {
    if (shown >= items.length) {
      shown = 0;
      typing = false;
      renderChat(shown, typing);
      schedule(GAP_MS);
      return;
    }
    if (items[shown].hasAttribute("data-typing") && !typing) {
      typing = true;
      renderChat(shown, typing);
      schedule(TYPING_MS);
      return;
    }
    typing = false;
    shown += 1;
    renderChat(shown, typing);
    schedule(shown >= items.length ? END_HOLD_MS : GAP_MS);
  }

  renderChat(0, false);
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top bottom",
    end: "bottom 20%",
    onToggle: function (self) {
      playing = self.isActive;
      if (playing) schedule(1600);
      else clearTimeout(timer);
    }
  });

  /* ---------------- Nav hides on the way down, returns on the way up ---------------- */
  var nav = $(".nav");
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: function (self) { nav.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > 300); }
  });

  /* ---------------- Hero ---------------- */
  gsap.timeline({ defaults: { ease: "expo.out" } })
    .from(".hero h1 .line > span", { yPercent: 115, duration: 1.1, stagger: 0.09 }, 0.1)
    .from(".hero .fade-up", { y: 28, autoAlpha: 0, duration: 0.8, stagger: 0.1 }, 0.5)
    .from(".tilt", { y: 120, duration: 1.3 }, 0.2)
    .from(".tilt", { autoAlpha: 0, duration: 0.3, ease: "power1.out" }, 0.2)
    .from(".shard-a", { xPercent: -30, scale: 0.7, autoAlpha: 0, duration: 1.1 }, 0.55)
    .from(".shard-b", { xPercent: 30, scale: 0.7, autoAlpha: 0, duration: 1.1 }, 0.62)
    .from(".chip-limit", { scale: 0.6, autoAlpha: 0, duration: 0.7, ease: "back.out(1.8)" }, 0.9);

  // On a phone the hero is a plain stacked layout: nothing is tied to the scroll.
  if (!window.matchMedia("(max-width: 900px)").matches) {
    // The phone straightens and the pieces drift apart as the hero leaves.
    var heroScrub = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
    gsap.fromTo(".tilt .phone", { rotateY: -14, rotateX: 6, rotateZ: 2, yPercent: 0 }, { rotateY: 0, rotateX: 0, rotateZ: 0, yPercent: -6, ease: "none", immediateRender: false, scrollTrigger: heroScrub });
    gsap.fromTo(".shard-a", { yPercent: 0, rotate: 0 }, { yPercent: -30, rotate: -10, ease: "none", immediateRender: false, scrollTrigger: heroScrub });
    gsap.fromTo(".shard-b", { yPercent: 0, rotate: 0 }, { yPercent: 34, rotate: 12, ease: "none", immediateRender: false, scrollTrigger: heroScrub });
    gsap.fromTo(".chip-limit", { yPercent: 0 }, { yPercent: -220, ease: "none", immediateRender: false, scrollTrigger: heroScrub });
    gsap.fromTo(".chip-booked", { yPercent: 0 }, { yPercent: 200, ease: "none", immediateRender: false, scrollTrigger: heroScrub });
    gsap.fromTo(".hero-copy", { yPercent: 0, opacity: 1 }, { yPercent: -14, opacity: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: ".hero", start: "top top", end: "65% top", scrub: true } });
  }

  /* ---------------- Marquee: rows slide against each other with the scroll ---------------- */
  $$(".mq-row").forEach(function (row) {
    var dir = Number(row.getAttribute("data-dir"));
    gsap.fromTo($(".mq-track", row), { xPercent: dir < 0 ? 0 : -40 }, {
      xPercent: dir < 0 ? -40 : 0,
      ease: "none",
      scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  /* ---------------- Operations: the board assembles, numbers count up, Doyo answers ---------------- */
  gsap.from($$(".ops-copy h2 .line > span"), { yPercent: 115, duration: 1.1, stagger: 0.09, ease: "expo.out", scrollTrigger: { trigger: ".ops-copy", start: "top 80%" } });
  gsap.from(".ops-copy .lede, .ops-link", { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".ops-copy", start: "top 75%" } });
  var board = gsap.timeline({ defaults: { ease: "expo.out" }, scrollTrigger: { trigger: ".ops-board", start: "top 80%" } })
    .from(".ops-board", { y: 80, autoAlpha: 0, duration: 1 })
    .from(".ops-kpis > div", { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.08 }, 0.3)
    .from(".ops-row > div", { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.12 }, 0.5)
    .fromTo(".rung i", { "--grow": 0 }, { "--grow": 1, duration: 1.1, stagger: 0.12, ease: "power3.out" }, 0.75)
    .fromTo(".ops-dial .dial", { attr: { "stroke-dasharray": "0 327" } }, { attr: { "stroke-dasharray": "87 327" }, duration: 1.2, ease: "power3.out" }, 0.75)
    .from(".ops-ask p", { y: 16, scale: 0.96, autoAlpha: 0, duration: 0.6, stagger: 0.7, ease: "back.out(1.6)" }, 1.4);
  $$(".ops-board [data-count]").forEach(function (el) {
    var to = Number(el.getAttribute("data-count"));
    var prefix = el.getAttribute("data-prefix") || "";
    var counter = { value: 0 };
    board.to(counter, { value: to, duration: 1.4, ease: "power2.out", onUpdate: function () { el.textContent = prefix + Math.round(counter.value).toLocaleString("en-US"); } }, 0.35);
  });

  gsap.from($$(".cta-copy h2 .line > span"), { yPercent: 115, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".cta-copy", start: "top 85%" } });

  gsap.from(".cta-card", { y: 80, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: ".cta-card", start: "top 88%" } });
  gsap.from(".cta-art", { yPercent: 35, ease: "none", scrollTrigger: { trigger: ".cta-card", start: "top bottom", end: "bottom bottom", scrub: true } });

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
