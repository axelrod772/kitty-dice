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

  var overlay = document.getElementById("reveal-overlay");
  var revealCard = document.getElementById("reveal-card");
  var winnerNameEl = document.getElementById("winner-name");
  var goldBag = document.getElementById("gold-bag");
  var bagTag = document.getElementById("bag-tag");
  var againBtn = document.getElementById("again-btn");
  var moneyLayer = document.getElementById("money-layer");
  var canvas = document.getElementById("confetti-canvas");

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

    countLabel.textContent = names.length + (names.length === 1 ? " member" : " members");
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
      ? "Looking good! Head to the draw and drop the chits in."
      : "Add at least 2 members to start the draw.";

    fillBtn.disabled = !enough || busy;
    pickBtn.disabled = !enough || !chitsInBox || busy;

    if (busy) return;
    if (!enough) {
      stageStatus.textContent = "Add members to begin.";
    } else if (!chitsInBox) {
      stageStatus.textContent = "Ready — drop the chits into the box.";
    } else {
      stageStatus.textContent = names.length + " chits are in the box. Pick a winner!";
    }
  }

  // ---- Add / clear members ----
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var val = input.value.trim();
    if (!val) return;
    if (names.length >= 40) { flashInput("Whoa, that's a big party!"); return; }
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
    input.style.borderColor = "#ff5da2";
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
    stageStatus.textContent = "Writing names & folding chits…";
    fillBtn.disabled = true;
    pickBtn.disabled = true;

    var boxRect = glassBox.getBoundingClientRect();
    var i = 0;

    function dropNext() {
      if (i >= names.length) {
        chitsInBox = true;
        busy = false;
        updateControls();
        stageStatus.textContent = "All " + names.length + " chits are in! Hit Pick a winner.";
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

  // Animate one folded chit flying from the top-center into the box.
  function flyChit(name, boxRect, done) {
    var flyer = document.createElement("div");
    flyer.className = "chit-flyer";
    flyer.innerHTML = '<div class="fold"></div>' + esc(initials(name) || "•");

    // Start above the box, roughly centered on screen top.
    var startX = boxRect.left + boxRect.width / 2 - 30;
    var startY = Math.max(60, boxRect.top - 170);
    var endX = boxRect.left + boxRect.width / 2 - 30 + (Math.random() * 40 - 20);
    var endY = boxRect.top + boxRect.height - 60 - Math.random() * 20;

    flyer.style.left = startX + "px";
    flyer.style.top = startY + "px";
    flyer.style.transform = "rotate(" + (Math.random() * 30 - 15) + "deg) scale(0.7)";
    flyer.style.transition = "none";
    document.body.appendChild(flyer);

    // Force reflow so the transition applies.
    // eslint-disable-next-line no-unused-expressions
    flyer.offsetHeight;

    flyer.style.transition = "left .5s cubic-bezier(.5,.05,.5,1), top .5s cubic-bezier(.4,.6,.5,1), transform .5s ease";
    flyer.style.left = endX + "px";
    flyer.style.top = endY + "px";
    flyer.style.transform = "rotate(" + (Math.random() * 60 - 30) + "deg) scale(0.5)";

    setTimeout(function () {
      flyer.remove();
      done();
    }, 520);
  }

  // Add a small static folded chit resting inside the box.
  function addRestingChit() {
    var chit = document.createElement("div");
    chit.className = "chit";
    var heap = chitsHeap.getBoundingClientRect();
    var maxX = Math.max(4, heap.width - 50);
    var maxY = Math.max(4, heap.height - 34);
    chit.style.left = Math.random() * maxX + "px";
    chit.style.top = (maxY - Math.random() * Math.min(maxY, 60)) + "px";
    chit.style.transform = "rotate(" + (Math.random() * 70 - 35) + "deg)";
    chitsHeap.appendChild(chit);
  }

  // ---- Pick: shake, then reveal ----
  pickBtn.addEventListener("click", function () {
    if (busy || !chitsInBox || names.length < 2) return;
    busy = true;
    updateControls();
    fillBtn.disabled = true;
    pickBtn.disabled = true;
    stageStatus.textContent = "Shaking the box… 🥁";

    glassBox.classList.add("shaking");
    // scramble resting chits a bit while shaking
    var scramble = setInterval(jiggleRestingChits, 120);

    setTimeout(function () {
      clearInterval(scramble);
      glassBox.classList.remove("shaking");

      var winner = names[Math.floor(Math.random() * names.length)];

      // pull one chit out visually
      pullOutChit(glassBox.getBoundingClientRect(), winner, function () {
        showWinner(winner);
      });
    }, 1700);
  });

  function jiggleRestingChits() {
    var chits = chitsHeap.querySelectorAll(".chit");
    chits.forEach(function (c) {
      c.style.transform = "rotate(" + (Math.random() * 80 - 40) + "deg) translate(" +
        (Math.random() * 6 - 3) + "px," + (Math.random() * 6 - 3) + "px)";
    });
  }

  // Animate a chit rising out of the box toward center screen.
  function pullOutChit(boxRect, name, done) {
    stageStatus.textContent = "And the chit is… ✨";
    var flyer = document.createElement("div");
    flyer.className = "chit-flyer";
    flyer.style.width = "80px";
    flyer.style.height = "52px";
    flyer.style.fontSize = "0.7rem";
    flyer.innerHTML = '<div class="fold"></div>' + esc(initials(name) || "•");

    var startX = boxRect.left + boxRect.width / 2 - 40;
    var startY = boxRect.top + 20;
    flyer.style.left = startX + "px";
    flyer.style.top = startY + "px";
    flyer.style.transform = "scale(0.5) rotate(-8deg)";
    flyer.style.transition = "none";
    document.body.appendChild(flyer);
    // eslint-disable-next-line no-unused-expressions
    flyer.offsetHeight;

    flyer.style.transition = "left .7s ease, top .7s cubic-bezier(.2,.8,.3,1), transform .7s ease";
    flyer.style.left = (window.innerWidth / 2 - 40) + "px";
    flyer.style.top = (window.innerHeight / 2 - 26) + "px";
    flyer.style.transform = "scale(1.6) rotate(6deg)";

    setTimeout(function () {
      flyer.style.transition = "transform .3s ease, opacity .3s ease";
      flyer.style.opacity = "0";
      flyer.style.transform = "scale(2.4) rotate(0deg)";
      setTimeout(function () { flyer.remove(); done(); }, 260);
    }, 760);
  }

  // ---- Winner reveal + celebration ----
  function showWinner(name) {
    winnerNameEl.textContent = name;
    bagTag.textContent = name;

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");

    // reset animation classes
    revealCard.classList.remove("in");
    goldBag.classList.remove("drop");
    // eslint-disable-next-line no-unused-expressions
    revealCard.offsetHeight;
    revealCard.classList.add("in");

    startConfetti();
    startMoneyShower();

    // Drop the gold bag slightly after the card appears.
    setTimeout(function () { goldBag.classList.add("drop"); }, 450);

    stageStatus.textContent = "🎉 " + name + " won the draw!";
  }

  againBtn.addEventListener("click", function () {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    stopConfetti();
    moneyLayer.innerHTML = "";
    busy = false;
    // keep chits in box so user can pick again immediately
    updateControls();
  });

  // ---- Money shower (emoji rain) ----
  function startMoneyShower() {
    moneyLayer.innerHTML = "";
    var emojis = ["💵", "💰", "🪙", "💸", "🤑", "💴"];
    var total = 46;
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

  // ---- Confetti (canvas) ----
  var confettiRunning = false;
  var confettiParticles = [];
  var confettiRaf = null;
  var ctx = canvas.getContext("2d");

  function sizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", sizeCanvas);

  function startConfetti() {
    sizeCanvas();
    confettiParticles = [];
    var colors = ["#ff5da2", "#7b4dff", "#f6c445", "#4de0c9", "#ff8a3d", "#ffffff"];
    for (var i = 0; i < 160; i++) {
      confettiParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        r: 4 + Math.random() * 6,
        c: colors[Math.floor(Math.random() * colors.length)],
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

  function loopConfetti() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    if (confettiRunning) confettiRaf = requestAnimationFrame(loopConfetti);
  }

  function stopConfetti() {
    confettiRunning = false;
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---- Boot ----
  renderList();
  updateControls();
  input.focus();
})();
