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
  var emptyState = document.getElementById("empty-state");

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
    emptyState.hidden = names.length > 0;

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
          // Phase 4 — a sealed chit rises, then bursts straight into the reveal
          drawChit(function () {
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

  // Phase 4: a sealed chit rises from the open box, holds for suspense, then
  // bursts outward — the name stays hidden until the reveal itself.
  function drawChit(done) {
    stageStatus.textContent = "Drawing a chit…";

    var chit = document.createElement("div");
    chit.className = "draw-chit";
    chit.innerHTML = '<div class="dc-fold"></div><div class="dc-seal">★</div>';
    document.body.appendChild(chit);
    // eslint-disable-next-line no-unused-expressions
    chit.offsetHeight;

    // rise & hover — kept sealed, name not shown
    chit.classList.add("rising");

    setTimeout(function () {
      stageStatus.textContent = "And the winner is…";
      boxSpotlight.classList.remove("on");
      glassBox.classList.remove("open");
      chit.classList.remove("rising");
      chit.classList.add("blast");
      done();
      setTimeout(function () { chit.remove(); }, 420);
    }, 1250);
  }

  // ---- Winner reveal + celebration ----
  // Slow build: rays + money first, the name materialises gradually, then the
  // payoff (flash, burst rings, fireworks, gold bag) once the name has landed.
  function showWinner(name) {
    winnerNameEl.textContent = name;
    bagTag.textContent = name;

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");

    // reset all reveal animation state
    revealCard.classList.remove("in");
    winnerNameEl.classList.remove("slow-in");
    goldBag.classList.remove("drop");
    lightRays.classList.remove("on");
    burstRing.classList.remove("go");
    burstRing2.classList.remove("go");
    screenFlash.classList.remove("go");
    // eslint-disable-next-line no-unused-expressions
    overlay.offsetHeight;

    // Build-up: rays glow in, the money shower starts, the card fades in with
    // the eyebrow, and the name begins its slow materialise.
    lightRays.classList.add("on");
    revealCard.classList.add("in");
    startCelebration();

    // slight beat, then the name reveals slowly (~1.9s)
    setTimeout(function () { winnerNameEl.classList.add("slow-in"); }, 250);

    // Payoff — once the name has fully materialised
    var PAYOFF = 250 + 1900;
    setTimeout(function () {
      screenFlash.classList.add("go");
      burstRing.classList.add("go");
      burstRing2.classList.add("go");
      goldBag.classList.add("drop");
      fireworkBurst();
      setTimeout(fireworkBurst, 450);
      setTimeout(fireworkBurst, 950);
      setTimeout(fireworkBurst, 1500);
    }, PAYOFF);

    stageStatus.textContent = name + " wins the draw.";
  }

  againBtn.addEventListener("click", function () {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    lightRays.classList.remove("on");
    stopConfetti();
    // reset box to its ready state
    glassBox.classList.remove("open", "charging", "shaking");
    boxSpotlight.classList.remove("on");
    resetRestingChits();
    busy = false;
    // keep chits in box so user can pick again immediately
    updateControls();
  });

  // ---- Celebration: confetti + gold-coin shower + firework sparks (canvas) ----
  var celebrating = false;
  var confetti = [];
  var coins = [];                // falling, spinning gold coins (money shower)
  var sparks = [];               // firework spark particles (gravity + fade)
  var raf = null;
  var coinTimer = null;
  var ctx = canvas.getContext("2d");
  var CONFETTI_COLS = ["#e7cd86", "#cb9a4f", "#9a7526", "#ece7db", "#c9b787", "#f5ecd0"];

  function sizeCanvas() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", function () { if (celebrating) sizeCanvas(); });

  function startCelebration() {
    sizeCanvas();
    confetti = []; coins = []; sparks = [];
    var W = window.innerWidth;
    var H = window.innerHeight;

    for (var i = 0; i < 150; i++) {
      confetti.push({
        x: Math.random() * W, y: Math.random() * -H,
        r: 4 + Math.random() * 5,
        c: CONFETTI_COLS[Math.floor(Math.random() * CONFETTI_COLS.length)],
        vy: 2 + Math.random() * 3.5, vx: -1.2 + Math.random() * 2.4,
        rot: Math.random() * Math.PI, vr: -0.14 + Math.random() * 0.28
      });
    }

    celebrating = true;
    if (!raf) loop();

    // Continuously rain coins for the duration of the reveal.
    spawnCoins(26);
    coinTimer = setInterval(function () {
      if (!celebrating) return;
      if (coins.length < 60) spawnCoins(8);
    }, 260);
  }

  function spawnCoins(n) {
    var W = window.innerWidth;
    for (var i = 0; i < n; i++) {
      var r = 9 + Math.random() * 7;
      coins.push({
        x: Math.random() * W,
        y: -20 - Math.random() * 200,
        r: r,
        vy: 2.4 + Math.random() * 2.6,
        vx: -0.8 + Math.random() * 1.6,
        phase: Math.random() * Math.PI * 2,     // spin phase (fakes 3D flip)
        spin: 0.06 + Math.random() * 0.06,
        tilt: -0.5 + Math.random()
      });
    }
  }

  // A radial burst of sparks from a point in the upper area.
  function fireworkBurst() {
    if (!celebrating) return;
    var W = window.innerWidth, H = window.innerHeight;
    var cx = W * (0.2 + Math.random() * 0.6);
    var cy = H * (0.14 + Math.random() * 0.26);
    var hue = CONFETTI_COLS[Math.floor(Math.random() * CONFETTI_COLS.length)];
    var count = 44;
    for (var i = 0; i < count; i++) {
      var ang = (Math.PI * 2 * i) / count + Math.random() * 0.15;
      var speed = 3 + Math.random() * 5;
      sparks.push({
        x: cx, y: cy,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
        c: hue, life: 1, decay: 0.012 + Math.random() * 0.02,
        size: 1.6 + Math.random() * 1.8
      });
    }
  }

  function drawCoin(c) {
    // width oscillates with the spin to imitate a coin flipping edge-on
    var w = Math.abs(Math.cos(c.phase)) * c.r + 1.5;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.tilt * 0.35);
    // rim
    var g = ctx.createLinearGradient(-w, -c.r, w, c.r);
    g.addColorStop(0, "#f4e2a0");
    g.addColorStop(0.5, "#d3ac52");
    g.addColorStop(1, "#916b1f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, c.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,88,24,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // inner face detail only when the coin is fairly face-on
    if (w > c.r * 0.55) {
      ctx.strokeStyle = "rgba(120,88,24,0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.66, c.r * 0.66, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(106,78,18,0.8)";
      ctx.font = "700 " + (c.r * 0.95) + "px Georgia, serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("₹", 0, c.r * 0.06);
    }
    ctx.restore();
  }

  function loop() {
    var H = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    confetti.forEach(function (p) {
      p.y += p.vy; p.x += p.vx; p.rot += p.vr;
      if (p.y > H + 20) { p.y = -20; p.x = Math.random() * window.innerWidth; }
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
      ctx.restore();
    });

    for (var j = coins.length - 1; j >= 0; j--) {
      var c = coins[j];
      c.y += c.vy; c.x += c.vx; c.phase += c.spin;
      if (c.y > H + 30) { coins.splice(j, 1); continue; }
      drawCoin(c);
    }

    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.06; s.vx *= 0.99;
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

    if (celebrating) raf = requestAnimationFrame(loop);
  }

  function stopConfetti() {
    celebrating = false;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (coinTimer) { clearInterval(coinTimer); coinTimer = null; }
    confetti = []; coins = []; sparks = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Boot ----
  renderList();
  updateControls();
  input.focus();
})();
