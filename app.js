/* Kitty Party Picker — add members, drop chits, shake & reveal a winner. */
(function () {
  "use strict";

  // ---- State ----
  var names = [];          // list of candidate names
  var chitsInBox = false;  // whether folded chits are currently sitting in the box
  var busy = false;        // guards against double-clicks during animations

  // ---- DOM refs ----
  var form = document.getElementById("add-form");
  var input = document.getElementById("name-input");
  var listEl = document.getElementById("names-list");
  var countLabel = document.getElementById("count-label");
  var clearBtn = document.getElementById("clear-btn");
  var entryHint = document.getElementById("entry-hint");

  var glassBox = document.getElementById("glass-box");
  var chitsHeap = document.getElementById("chits-heap");
  var fillBtn = document.getElementById("fill-btn");
  var pickBtn = document.getElementById("pick-btn");
  var stageStatus = document.getElementById("stage-status");

  var boxLid = document.getElementById("box-lid");
  var boxGlow = document.getElementById("box-glow");
  var boxSpotlight = document.getElementById("box-spotlight");

  var overlay = document.getElementById("reveal-overlay");
  var revealCard = document.getElementById("reveal-card");
  var winnerNameEl = document.getElementById("winner-name");
  var goldBag = document.getElementById("gold-bag");
  var bagTag = document.getElementById("bag-tag");
  var againBtn = document.getElementById("again-btn");
  var moneyLayer = document.getElementById("money-layer");
  var canvas = document.getElementById("confetti-canvas");
  var lightRays = document.getElementById("light-rays");
  var burstRing = document.getElementById("burst-ring");
  var burstRing2 = document.getElementById("burst-ring-2");
  var screenFlash = document.getElementById("screen-flash");

  // ---- Helpers ----
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    var parts = name.trim().split(/\s+/);
    var a = parts[0] ? parts[0][0] : "";
    var b = parts[1] ? parts[1][0] : "";
    return (a + b).toUpperCase();
  }

  function renderList() {
    listEl.innerHTML = "";
    names.forEach(function (name, i) {
      var li = document.createElement("li");
      li.innerHTML =
        '<span class="name-txt"><span class="idx">' + (i + 1) + ".</span>" +
        esc(name) + "</span>" +
        '<button class="remove-x" title="Remove" aria-label="Remove ' +
        esc(name) + '">×</button>';
      li.querySelector(".remove-x").addEventListener("click", function () {
        names.splice(i, 1);
        onNamesChanged();
      });
      listEl.appendChild(li);
    });

    countLabel.textContent = names.length + (names.length === 1 ? " entrant" : " entrants");
    clearBtn.hidden = names.length === 0;
  }

  function onNamesChanged() {
    // Adding/removing invalidates whatever chits were in the box.
    chitsInBox = false;
    chitsHeap.innerHTML = "";
    renderList();
    updateControls();
  }

  function updateControls() {
    var enough = names.length >= 2;
    entryHint.textContent = enough
      ? "Ready. Seal the box to begin."
      : "Add at least 2 entrants to start the draw.";

    fillBtn.disabled = !enough || busy;
    pickBtn.disabled = !enough || !chitsInBox || busy;

    if (busy) return;
    if (!enough) {
      stageStatus.textContent = "Add entrants to begin.";
    } else if (!chitsInBox) {
      stageStatus.textContent = "Ready — seal the box to begin.";
    } else {
      stageStatus.textContent = names.length + " chits sealed in the box. Draw a winner.";
    }
  }

  // ---- Add / clear members ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = input.value.trim();
    if (!val) return;
    if (names.length >= 40) { flashInput("That's the maximum number of entrants"); return; }
    if (names.some(function (n) { return n.toLowerCase() === val.toLowerCase(); })) {
      flashInput("That name is already added");
      return;
    }
    names.push(val);
    input.value = "";
    input.focus();
    onNamesChanged();
  });

  function flashInput(msg) {
    var prev = input.placeholder;
    input.value = "";
    input.placeholder = msg;
    input.style.borderColor = "#cb9a4f";
    setTimeout(function () {
      input.placeholder = prev;
      input.style.borderColor = "";
    }, 1400);
  }

  clearBtn.addEventListener("click", function () {
    names = [];
    onNamesChanged();
  });

  // ---- Fill the box: write names on chits and fly them in one by one ----
  fillBtn.addEventListener("click", function () {
    if (busy || names.length < 2) return;
    busy = true;
    chitsHeap.innerHTML = "";
    chitsInBox = false;
    updateControls();
    stageStatus.textContent = "Writing the names & folding the chits…";
    fillBtn.disabled = true;
    pickBtn.disabled = true;

    var boxRect = glassBox.getBoundingClientRect();
    var i = 0;

    function dropNext() {
      if (i >= names.length) {
        chitsInBox = true;
        busy = false;
        updateControls();
        stageStatus.textContent = "All " + names.length + " chits sealed. Draw a winner.";
        return;
      }
      flyChit(names[i], boxRect, function () {
        addRestingChit();
        i++;
        setTimeout(dropNext, 130);
      });
    }
    dropNext();
  });

  // Animate one folded chit: appear at the pen, fold, then arc into the box.
  function flyChit(name, boxRect, done) {
    var flyer = document.createElement("div");
    flyer.className = "chit-flyer";
    flyer.innerHTML = '<div class="fold"></div>' + esc(initials(name) || "•");

    // Start above the box; arc in via a mid control point (fake bezier in 2 hops).
    var startX = boxRect.left + boxRect.width / 2 - 30 + (Math.random() * 90 - 45);
    var startY = Math.max(50, boxRect.top - 190);
    var midX = boxRect.left + boxRect.width / 2 - 30 + (Math.random() * 30 - 15);
    var midY = boxRect.top - 60;
    var endX = boxRect.left + boxRect.width / 2 - 30 + (Math.random() * 50 - 25);
    var endY = boxRect.top + boxRect.height - 58 - Math.random() * 22;

    flyer.style.left = startX + "px";
    flyer.style.top = startY + "px";
    flyer.style.transform = "rotate(" + (Math.random() * 20 - 10) + "deg) scale(0.4)";
    flyer.style.opacity = "0";
    flyer.style.transition = "none";
    document.body.appendChild(flyer);
    // eslint-disable-next-line no-unused-expressions
    flyer.offsetHeight;

    // Hop 1: pen appears & "writes" (grow to full size, folding look)
    flyer.style.transition = "left .28s ease-out, top .28s ease-out, transform .28s ease-out, opacity .18s ease";
    flyer.style.opacity = "1";
    flyer.style.left = midX + "px";
    flyer.style.top = midY + "px";
    flyer.style.transform = "rotate(" + (Math.random() * 16 - 8) + "deg) scale(1)";

    // Hop 2: drop into the box, shrinking & spinning as it falls
    setTimeout(function () {
      flyer.style.transition = "left .34s ease-in, top .34s cubic-bezier(.5,0,.9,.5), transform .34s ease-in";
      flyer.style.left = endX + "px";
      flyer.style.top = endY + "px";
      flyer.style.transform = "rotate(" + (Math.random() * 90 - 45) + "deg) scale(0.5)";
    }, 300);

    setTimeout(function () {
      spawnPuff(endX + 26, endY + 24);
      flyer.remove();
      done();
    }, 660);
  }

  // A small dust puff at a screen coordinate.
  function spawnPuff(x, y) {
    var p = document.createElement("div");
    p.className = "puff";
    p.style.left = (x - 5) + "px";
    p.style.top = (y - 5) + "px";
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 520);
  }

  // Add a folded chit resting inside the box, with a bounce-settle.
  function addRestingChit() {
    var chit = document.createElement("div");
    chit.className = "chit landing";
    var heap = chitsHeap.getBoundingClientRect();
    var maxX = Math.max(4, heap.width - 50);
    var maxY = Math.max(4, heap.height - 34);
    var rot = (Math.random() * 70 - 35);
    chit.style.setProperty("--r", rot + "deg");
    chit.style.left = Math.random() * maxX + "px";
    chit.style.top = (maxY - Math.random() * Math.min(maxY, 60)) + "px";
    chit.style.transform = "rotate(" + rot + "deg)";
    chitsHeap.appendChild(chit);
    setTimeout(function () { chit.classList.remove("landing"); }, 360);
  }

  // ---- Pick: charge → shake → open lid → draw → unfold → reveal ----
  pickBtn.addEventListener("click", function () {
    if (busy || !chitsInBox || names.length < 2) return;
    busy = true;
    updateControls();
    fillBtn.disabled = true;
    pickBtn.disabled = true;

    var winner = names[Math.floor(Math.random() * names.length)];

    // Phase 1 — charge up (anticipation)
    stageStatus.textContent = "Steady… the draw begins.";
    boxSpotlight.classList.add("on");
    glassBox.classList.add("charging");

    setTimeout(function () {
      glassBox.classList.remove("charging");

      // Phase 2 — intense shake with tumbling chits
      stageStatus.textContent = "Shaking the box…";
      glassBox.classList.add("shaking");
      var scramble = setInterval(jiggleRestingChits, 90);

      setTimeout(function () {
        clearInterval(scramble);
        glassBox.classList.remove("shaking");
        resetRestingChits();

        // Phase 3 — lid swings open
        stageStatus.textContent = "Opening the box…";
        glassBox.classList.add("open");

        setTimeout(function () {
          // Phase 4 — a chit rises, unfolds, then bursts into the reveal
          drawChit(winner, function () {
            showWinner(winner);
          });
        }, 520);
      }, 1900);
    }, 900);
  });

  function jiggleRestingChits() {
    var chits = chitsHeap.querySelectorAll(".chit");
    chits.forEach(function (c) {
      c.style.transform = "rotate(" + (Math.random() * 120 - 60) + "deg) translate(" +
        (Math.random() * 14 - 7) + "px," + (Math.random() * 14 - 7) + "px)";
    });
  }

  function resetRestingChits() {
    var chits = chitsHeap.querySelectorAll(".chit");
    chits.forEach(function (c) {
      var r = c.style.getPropertyValue("--r") || "0deg";
      c.style.transform = "rotate(" + r + ")";
    });
  }

  // Phase 4: a chit rises from the open box, holds, unfolds to show the name,
  // then blasts outward — handing off to the celebration.
  function drawChit(name, done) {
    stageStatus.textContent = "Drawing a chit…";

    var chit = document.createElement("div");
    chit.className = "draw-chit";
    chit.innerHTML =
      '<div class="dc-fold"></div>' +
      '<div class="dc-label">The winner is</div>' +
      '<div class="dc-name">' + esc(name) + "</div>";
    document.body.appendChild(chit);
    // eslint-disable-next-line no-unused-expressions
    chit.offsetHeight;

    // rise & hover (folded — only initials-ish look, name hidden by fold line)
    chit.classList.add("rising");

    setTimeout(function () {
      // suspense beat, then unfold to reveal the written name
      stageStatus.textContent = "And the name is…";
      chit.classList.remove("rising");
      chit.classList.add("unfold");
    }, 1050);

    setTimeout(function () {
      // blast the chit outward and hand off to the big reveal
      boxSpotlight.classList.remove("on");
      glassBox.classList.remove("open");
      chit.classList.remove("unfold");
      chit.classList.add("blast");
      done();
      setTimeout(function () { chit.remove(); }, 420);
    }, 1050 + 900);
  }

  // ---- Winner reveal + celebration ----
  function showWinner(name) {
    winnerNameEl.textContent = name;
    bagTag.textContent = name;

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");

    // reset all reveal animation state
    revealCard.classList.remove("in");
    goldBag.classList.remove("drop");
    lightRays.classList.remove("on");
    burstRing.classList.remove("go");
    burstRing2.classList.remove("go");
    screenFlash.classList.remove("go");
    // eslint-disable-next-line no-unused-expressions
    overlay.offsetHeight;

    // Bang — flash, rays, rings and the name punch in together
    screenFlash.classList.add("go");
    lightRays.classList.add("on");
    burstRing.classList.add("go");
    burstRing2.classList.add("go");
    revealCard.classList.add("in");

    startConfetti();
    fireworkBurst();
    startMoneyShower();

    // A couple of follow-up firework bursts for drama
    setTimeout(fireworkBurst, 500);
    setTimeout(fireworkBurst, 1000);

    // Gold bag slams down after the name lands
    setTimeout(function () { goldBag.classList.add("drop"); }, 520);

    stageStatus.textContent = name + " wins the draw.";
  }

  againBtn.addEventListener("click", function () {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    lightRays.classList.remove("on");
    stopConfetti();
    moneyLayer.innerHTML = "";
    // reset box to its ready state
    glassBox.classList.remove("open", "charging", "shaking");
    boxSpotlight.classList.remove("on");
    resetRestingChits();
    busy = false;
    // keep chits in box so user can pick again immediately
    updateControls();
  });

  // ---- Money shower (emoji rain) ----
  function startMoneyShower() {
    moneyLayer.innerHTML = "";
    var emojis = ["💵", "💰", "🪙", "💸", "💴", "💷"];
    var total = 54;
    for (var k = 0; k < total; k++) {
      (function (k) {
        setTimeout(function () {
          if (!overlay.classList.contains("show")) return;
          var s = document.createElement("span");
          s.className = "money";
          s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          s.style.left = Math.random() * 100 + "vw";
          s.style.fontSize = (1.2 + Math.random() * 1.6) + "rem";
          var dur = 2.6 + Math.random() * 2.2;
          s.style.animationDuration = dur + "s";
          moneyLayer.appendChild(s);
          setTimeout(function () { s.remove(); }, dur * 1000 + 200);
        }, k * 90);
      })(k);
    }
  }

  // ---- Confetti + fireworks (canvas) ----
  var confettiRunning = false;
  var confettiParticles = [];
  var sparks = [];               // firework spark particles (gravity + fade)
  var confettiRaf = null;
  var ctx = canvas.getContext("2d");
  var PALETTE = ["#e7cd86", "#cb9a4f", "#9a7526", "#ece7db", "#c9b787", "#f5ecd0"];

  function sizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", sizeCanvas);

  function startConfetti() {
    sizeCanvas();
    confettiParticles = [];
    sparks = [];
    for (var i = 0; i < 170; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        r: 4 + Math.random() * 6,
        c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        vy: 2 + Math.random() * 4,
        vx: -1.5 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        vr: -0.15 + Math.random() * 0.3
      });
    }
    if (!confettiRunning) {
      confettiRunning = true;
      loopConfetti();
    }
  }

  // Emit a radial burst of sparks from a random point in the upper area.
  function fireworkBurst() {
    if (!overlay.classList.contains("show")) return;
    sizeCanvas();
    var cx = canvas.width * (0.2 + Math.random() * 0.6);
    var cy = canvas.height * (0.15 + Math.random() * 0.3);
    var hue = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    var n = 46;
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.15;
      var speed = 3 + Math.random() * 5;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        c: hue,
        life: 1,
        decay: 0.012 + Math.random() * 0.02,
        size: 2 + Math.random() * 2
      });
    }
    if (!confettiRunning) { confettiRunning = true; loopConfetti(); }
  }

  function loopConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // falling confetti
    confettiParticles.forEach(function (p) {
      p.y += p.vy;
      p.x += p.vx;
      p.rot += p.vr;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    });

    // firework sparks (gravity + fade)
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.06;       // gravity
      s.vx *= 0.99;
      s.life -= s.decay;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life);
      ctx.fillStyle = s.c;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (confettiRunning) confettiRaf = requestAnimationFrame(loopConfetti);
  }

  function stopConfetti() {
    confettiRunning = false;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiParticles = [];
    sparks = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Boot ----
  renderList();
  updateControls();
  input.focus();
})();
