(function () {
  "use strict";

  const DATA = window.NAVAL_MODALS_DATA;
  const SYNC = window.NAVAL_MODALS_SYNC;
  const AVATARS = ["⚓", "🚢", "🛟", "🧭", "⚙️", "🔧", "🌊", "🦺", "📡", "🔥", "🛰️", "🪝"];
  const RANKS = [
    { min: 0, label: "Grumete", icon: "🐣" },
    { min: 800, label: "Marinero", icon: "⛵" },
    { min: 1600, label: "Oficial de Guardia", icon: "🧭" },
    { min: 2400, label: "Primer Oficial", icon: "🎖️" },
    { min: 3200, label: "Jefe de Máquinas", icon: "⚙️" },
    { min: 4200, label: "Capitán", icon: "⚓" },
    { min: 5500, label: "Almirante de la Flota", icon: "👑" }
  ];

  const el = (id) => document.getElementById(id);
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const state = {
    adapter: null,
    mode: null,           // 'solo' | 'multi'
    role: null,            // 'host' | 'guest'
    code: null,
    playerId: null,
    name: "",
    avatar: "⚓",
    schedule: null,
    startAt: null,
    unsubscribe: null,
    room: null,
    currentSlotIndex: -1,
    answered: false,
    score: 0,
    streak: 0,
    correctCount: 0,
    answeredCount: 0,
    missed: [],
    mult: { value: 1, questionsLeft: 0 },
    windowMult: null,
    flatBonus: { value: 0, questionsLeft: 0 },
    glossaryLockedUntil: 0,
    soundOn: true,
    pendingMode: "create",
    selectedAvatar: { create: "⚓", join: "⚓" },
    ticking: false,
    fastAnswers: 0
  };

  // ---------------- Navigation ----------------
  function showScreen(id) {
    $$(".screen").forEach((s) => s.classList.remove("active"));
    const target = el("screen-" + id);
    if (target) target.classList.add("active");
  }

  $$("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "create" || target === "solo") {
        state.pendingMode = target;
        renderCreateScreenMode();
        showScreen("create");
      } else {
        showScreen(target);
      }
    });
  });
  el("btn-home-logo").addEventListener("click", () => {
    teardownGame();
    showScreen("home");
  });

  function renderCreateScreenMode() {
    const panel = $("#screen-create h2");
    const btn = el("btn-do-create");
    if (state.pendingMode === "solo") {
      panel.textContent = "Práctica en solitario";
      btn.textContent = "Empezar guardia";
    } else {
      panel.textContent = "Crear sala";
      btn.textContent = "Generar código de sala";
    }
  }

  // ---------------- Avatar pickers ----------------
  function renderAvatarGrid(containerId, group) {
    const c = el(containerId);
    c.innerHTML = "";
    AVATARS.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "avatar-opt" + (a === state.selectedAvatar[group] ? " selected" : "");
      b.textContent = a;
      b.addEventListener("click", () => {
        state.selectedAvatar[group] = a;
        $$(".avatar-opt", c).forEach((x) => x.classList.remove("selected"));
        b.classList.add("selected");
      });
      c.appendChild(b);
    });
  }
  renderAvatarGrid("create-avatars", "create");
  renderAvatarGrid("join-avatars", "join");

  // ---------------- Create / Join / Solo ----------------
  el("btn-do-create").addEventListener("click", async () => {
    const name = el("create-name").value.trim() || "Oficial";
    const avatar = state.selectedAvatar.create;
    if (state.pendingMode === "solo") {
      startSolo(name, avatar);
      return;
    }
    state.adapter = SYNC.createAdapter();
    updateSyncBadge();
    const btn = el("btn-do-create");
    btn.disabled = true;
    try {
      const { code, playerId } = await state.adapter.createRoom(name, avatar);
      state.mode = "multi";
      state.role = "host";
      state.code = code;
      state.playerId = playerId;
      state.name = name;
      state.avatar = avatar;
      enterLobby();
    } finally {
      btn.disabled = false;
    }
  });

  el("btn-do-join").addEventListener("click", async () => {
    const code = el("join-code").value.trim().toUpperCase();
    const name = el("join-name").value.trim() || "Tripulante";
    const avatar = state.selectedAvatar.join;
    const errorEl = el("join-error");
    errorEl.classList.add("hidden");
    if (code.length < 4) {
      errorEl.textContent = "Introduce un código de sala válido.";
      errorEl.classList.remove("hidden");
      return;
    }
    state.adapter = SYNC.createAdapter();
    updateSyncBadge();
    const btn = el("btn-do-join");
    btn.disabled = true;
    try {
      const res = await state.adapter.joinRoom(code, name, avatar);
      state.mode = "multi";
      state.role = "guest";
      state.code = res.code;
      state.playerId = res.playerId;
      state.name = name;
      state.avatar = avatar;
      enterLobby();
    } catch (e) {
      errorEl.textContent = "No se ha encontrado esa sala. Comprueba el código.";
      errorEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
    }
  });

  function updateSyncBadge() {
    const badge = el("sync-badge");
    if (!state.adapter) { badge.textContent = "—"; badge.classList.remove("on"); return; }
    if (state.adapter.mode === "firebase") {
      badge.textContent = "🌐 Multijugador en red";
      badge.classList.add("on");
    } else {
      badge.textContent = "💻 Modo local (mismo navegador)";
      badge.classList.remove("on");
    }
  }

  function enterLobby() {
    el("lobby-code").textContent = state.code;
    el("lobby-hint").textContent = state.adapter.mode === "firebase"
      ? "Comparte este código con tu tripulación en cualquier dispositivo."
      : "Modo local: este código solo sincroniza pestañas de este mismo navegador. Configura Firebase para multijugador entre dispositivos (ver README).";
    el("btn-start-game").classList.toggle("hidden", state.role !== "host");
    el("lobby-wait").classList.toggle("hidden", state.role === "host");
    showScreen("lobby");
    if (state.unsubscribe) state.unsubscribe();
    state.unsubscribe = state.adapter.subscribe(state.code, onRoomUpdate);
  }

  el("btn-copy-code").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.code);
      el("btn-copy-code").textContent = "¡Copiado!";
      setTimeout(() => (el("btn-copy-code").textContent = "Copiar código"), 1500);
    } catch (e) { /* clipboard unavailable */ }
  });

  el("btn-start-game").addEventListener("click", () => {
    state.adapter.startGame(state.code);
  });

  function onRoomUpdate(room) {
    if (!room) return;
    state.room = room;
    if ($("#screen-lobby").classList.contains("active")) {
      renderLobbyPlayers(room);
    }
    if (room.status === "playing" && !state.schedule) {
      state.schedule = SYNC.buildSchedule(state.code);
      state.startAt = room.startAt;
      beginGameScreen();
    }
    renderLeaderboard(room);
  }

  function renderLobbyPlayers(room) {
    const list = el("lobby-players");
    list.innerHTML = "";
    Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt).forEach((p) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="p-avatar">${p.avatar}</span><span class="p-name">${escapeHtml(p.name)}</span>`;
      list.appendChild(li);
    });
  }

  // ---------------- Solo mode ----------------
  function startSolo(name, avatar) {
    state.adapter = null;
    state.mode = "solo";
    state.role = "host";
    state.name = name;
    state.avatar = avatar;
    state.code = "SOLO-" + Math.random().toString(36).slice(2, 8);
    state.schedule = SYNC.buildSchedule(state.code);
    state.startAt = Date.now() + 1500;
    state.room = null;
    beginGameScreen();
  }

  // ---------------- Game engine ----------------
  function beginGameScreen() {
    resetRunState();
    showScreen("game");
    el("leaderboard-panel").classList.toggle("hidden", state.mode === "solo");
    if (!state.ticking) {
      state.ticking = true;
      requestAnimationFrame(gameTick);
    }
  }

  function resetRunState() {
    state.currentSlotIndex = -1;
    state.answered = false;
    state.score = 0;
    state.streak = 0;
    state.correctCount = 0;
    state.answeredCount = 0;
    state.log = [];
    state.missed = [];
    state.mult = { value: 1, questionsLeft: 0 };
    state.windowMult = null;
    state.flatBonus = { value: 0, questionsLeft: 0 };
    state.glossaryLockedUntil = 0;
    state.fastAnswers = 0;
  }

  let lastTickSecond = -1;
  function gameTick() {
    if ($("#screen-game").classList.contains("active") && state.startAt !== null) {
      const now = Date.now();
      const elapsed = now - state.startAt;

      if (elapsed < 0) {
        el("timer-text").textContent = "Preparando…";
        el("q-prompt").textContent = `La guardia comienza en ${Math.ceil(-elapsed / 1000)}…`;
        el("q-options").innerHTML = "";
        el("q-counter").textContent = `1 / ${SYNC.QUESTIONS_PER_ROOM}`;
      } else {
        const totalMs = state.schedule.totalMs;
        const remainingMs = Math.max(0, totalMs - elapsed);
        updateTimerHud(remainingMs, totalMs);

        if (remainingMs <= 0) {
          finishGame();
          return;
        }

        const slotIndex = Math.min(state.schedule.slots.length - 1, Math.floor(elapsed / SYNC.SLOT_MS));
        const slot = state.schedule.slots[slotIndex];

        if (slotIndex !== state.currentSlotIndex) {
          if (slot.event) applyEvent(slot.event, now);
          renderQuestion(slot);
        }

        if (!state.answered) {
          const answerRemaining = slot.answerEndMs - elapsed;
          const pct = Math.max(0, Math.min(100, (answerRemaining / SYNC.ANSWER_WINDOW_MS) * 100));
          el("answer-fill").style.width = pct + "%";
          if (answerRemaining <= 0) {
            lockAnswer(slot, -1, now);
          }
        }

        updateGlossaryLockUi(now);
      }
    }
    requestAnimationFrame(gameTick);
  }

  function updateTimerHud(remainingMs, totalMs) {
    const s = Math.ceil(remainingMs / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    if (s !== lastTickSecond) {
      lastTickSecond = s;
      el("timer-text").textContent = `${mm}:${ss}`;
    }
    const fill = el("timer-fill");
    fill.style.width = Math.max(0, (remainingMs / totalMs) * 100) + "%";
    fill.classList.toggle("warn", remainingMs < 120000);
  }

  function renderQuestion(slot) {
    state.currentSlotIndex = slot.index;
    state.answered = false;
    el("q-counter").textContent = `${slot.index + 1} / ${state.schedule.slots.length}`;
    el("q-category").textContent = slot.question.category;
    const diff = el("q-difficulty");
    diff.textContent = { easy: "Fácil", medium: "Media", hard: "Difícil" }[slot.question.difficulty];
    diff.className = "badge-difficulty " + slot.question.difficulty;
    el("q-points").textContent = slot.question.points + " pts base";
    el("q-prompt").innerHTML = highlightGlossary(slot.question.prompt);
    el("q-feedback").textContent = "";
    el("answer-fill").style.width = "100%";

    const opts = el("q-options");
    opts.innerHTML = "";
    slot.question.options.forEach((opt, i) => {
      const b = document.createElement("button");
      b.className = "opt-btn";
      b.type = "button";
      b.innerHTML = `<span class="k">${"ABCD"[i]}</span>${escapeHtml(opt)}`;
      b.addEventListener("click", () => lockAnswer(slot, i, Date.now()));
      opts.appendChild(b);
    });
  }

  function lockAnswer(slot, chosenIndex, now) {
    if (state.answered) return;
    state.answered = true;
    const correct = chosenIndex === slot.question.correct;
    const answerRemaining = Math.max(0, slot.answerEndMs - now);
    const speedFraction = answerRemaining / SYNC.ANSWER_WINDOW_MS;

    let points = 0;
    if (correct) {
      const multiplier = getActiveMultiplier(now);
      const base = slot.question.points * multiplier;
      const speedBonus = Math.round(slot.question.points * 0.5 * speedFraction);
      let awarded = Math.round(base + speedBonus);
      if (state.streak >= 2) awarded = Math.round(awarded * 1.2);
      if (state.flatBonus.questionsLeft > 0) awarded += state.flatBonus.value;
      points = awarded;
      state.score += points;
      state.streak += 1;
      state.correctCount += 1;
      if (speedFraction > 0.7) state.fastAnswers += 1;
      playTone(correct ? 880 : 220, 0.12, "sine");
    } else {
      state.streak = 0;
      state.missed.push({
        prompt: slot.question.prompt,
        correctOption: slot.question.options[slot.question.correct],
        explain: slot.question.explain
      });
      playTone(160, 0.2, "sawtooth");
    }

    state.answeredCount += 1;
    if (state.mult.questionsLeft > 0) state.mult.questionsLeft -= 1;
    if (state.flatBonus.questionsLeft > 0) state.flatBonus.questionsLeft -= 1;

    $$(".opt-btn", el("q-options")).forEach((b, i) => {
      b.disabled = true;
      if (i === slot.question.correct) b.classList.add("correct");
      else if (i === chosenIndex) b.classList.add("wrong");
    });

    el("score-value").textContent = state.score.toLocaleString("es-ES");
    el("streak-value").textContent = state.streak >= 2 ? `🔥 Racha x${state.streak}` : "";
    el("q-feedback").textContent = correct
      ? `¡Correcto! +${points} pts — ${slot.question.explain}`
      : chosenIndex === -1
        ? `Tiempo agotado. Respuesta correcta: "${slot.question.options[slot.question.correct]}" — ${slot.question.explain}`
        : `Incorrecto. Respuesta correcta: "${slot.question.options[slot.question.correct]}" — ${slot.question.explain}`;

    if (state.mode === "multi" && state.adapter) {
      state.adapter.updatePlayer(state.code, state.playerId, {
        score: state.score, streak: state.streak, correct: state.correctCount, answered: state.answeredCount
      });
    }
  }

  function getActiveMultiplier(now) {
    let m = 1;
    if (state.mult.questionsLeft > 0) m = Math.max(m, state.mult.value);
    if (state.windowMult && now < state.windowMult.expiresAt) m = Math.max(m, state.windowMult.value);
    return m;
  }

  function applyEvent(event, now) {
    const eff = event.effect;
    if (eff.multiplier && eff.questions) state.mult = { value: eff.multiplier, questionsLeft: eff.questions };
    if (eff.multiplier && eff.windowMs) state.windowMult = { value: eff.multiplier, expiresAt: now + eff.windowMs };
    if (eff.flatBonus) state.flatBonus = { value: eff.flatBonus, questionsLeft: eff.questions || 1 };
    if (eff.timeDeltaSeconds) state.startAt += eff.timeDeltaSeconds * 1000;
    if (eff.lockGlossarySeconds) state.glossaryLockedUntil = now + eff.lockGlossarySeconds * 1000;
    showEventBanner(event);
    playTone(520, 0.18, "square");
  }

  let bannerTimeout = null;
  function showEventBanner(event) {
    const banner = el("event-banner");
    banner.innerHTML = `<div class="ev-title">${event.icon} ${escapeHtml(event.title)}</div><div class="ev-desc">${escapeHtml(event.desc)}</div>`;
    banner.classList.remove("hidden");
    requestAnimationFrame(() => banner.classList.add("show"));
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => {
      banner.classList.remove("show");
      setTimeout(() => banner.classList.add("hidden"), 400);
    }, 5200);
  }

  function updateGlossaryLockUi(now) {
    const locked = now < state.glossaryLockedUntil;
    el("btn-glossary").disabled = locked;
    el("btn-glossary").style.opacity = locked ? .4 : 1;
  }

  // ---------------- Finish / Results ----------------
  function finishGame() {
    state.startAt = null;
    if (state.mode === "multi" && state.role === "host" && state.adapter) {
      state.adapter.endGame(state.code);
    }
    renderResults();
    showScreen("results");
    burstConfetti();
  }

  function renderResults() {
    const rank = RANKS.slice().reverse().find((r) => state.score >= r.min) || RANKS[0];
    el("results-rank").textContent = `${rank.icon} ${rank.label}`;
    el("results-score").textContent = `${state.score.toLocaleString("es-ES")} pts`;
    const acc = state.answeredCount ? Math.round((state.correctCount / state.answeredCount) * 100) : 0;
    el("results-accuracy").textContent = acc + "%";

    const badges = [];
    if (state.answeredCount > 0 && state.correctCount === state.answeredCount) badges.push({ icon: "🎯", label: "Sin fallos" });
    if (state.fastAnswers >= 6) badges.push({ icon: "⚡", label: "Reflejos de radar" });
    if (state.streak >= 5) badges.push({ icon: "🔥", label: "Racha del Capitán" });
    if (state.answeredCount === state.schedule.slots.length) badges.push({ icon: "🧭", label: "Guardia completa" });
    if (state.score >= 4200) badges.push({ icon: "⚓", label: "Apto para el puente" });
    el("results-badges").innerHTML = badges.length
      ? badges.map((b) => `<span class="badge-pill" title="${escapeHtml(b.label)}">${b.icon}</span>`).join("")
      : `<span style="color:var(--text-1);font-size:14px;">Sigue entrenando para desbloquear insignias</span>`;

    const review = el("results-review");
    review.innerHTML = "";
    if (!state.missed.length) {
      review.innerHTML = `<p style="color:var(--text-1);">¡Ninguna pregunta fallada! Guardia impecable. 🎖️</p>`;
    } else {
      state.missed.forEach((m) => {
        const div = document.createElement("div");
        div.className = "review-item";
        div.innerHTML = `<div class="rv-prompt">${escapeHtml(m.prompt).replace("___", "<u>___</u>")}</div>
          <div class="rv-answer">Respuesta correcta: "${escapeHtml(m.correctOption)}"</div>
          <div class="rv-explain">${escapeHtml(m.explain)}</div>`;
        review.appendChild(div);
      });
    }

    renderPodium();
  }

  function renderPodium() {
    const podium = el("podium");
    let players;
    if (state.mode === "multi" && state.room) {
      players = Object.entries(state.room.players || {}).map(([id, p]) => ({
        id, name: p.name, avatar: p.avatar, score: id === state.playerId ? state.score : (p.score || 0)
      }));
    } else {
      players = [{ id: "me", name: state.name, avatar: state.avatar, score: state.score }];
    }
    players.sort((a, b) => b.score - a.score);
    const top = players.slice(0, 3);
    const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
    const medals = ["🥇", "🥈", "🥉"];
    podium.innerHTML = order.map((idx) => {
      const p = top[idx];
      if (!p) return "";
      return `<div class="podium-slot p${idx + 1}">
        <div class="podium-medal">${medals[idx]}</div>
        <div class="podium-bar"></div>
        <div class="podium-name">${p.avatar} ${escapeHtml(p.name)}</div>
        <div class="podium-score">${p.score.toLocaleString("es-ES")} pts</div>
      </div>`;
    }).join("");
  }

  el("btn-play-again").addEventListener("click", () => {
    if (state.mode === "solo") {
      startSolo(state.name, state.avatar);
    } else {
      teardownGame();
      showScreen("home");
    }
  });
  el("btn-back-home").addEventListener("click", () => {
    teardownGame();
    showScreen("home");
  });

  function teardownGame() {
    if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }
    state.adapter = null;
    state.mode = null;
    state.schedule = null;
    state.startAt = null;
    state.code = null;
    state.room = null;
  }

  // ---------------- Leaderboard ----------------
  function renderLeaderboard(room) {
    if (state.mode !== "multi" || !$("#screen-game").classList.contains("active")) return;
    const list = el("leaderboard-list");
    const players = Object.entries(room.players || {}).map(([id, p]) => ({
      id, name: p.name, avatar: p.avatar, score: id === state.playerId ? state.score : (p.score || 0)
    })).sort((a, b) => b.score - a.score);
    list.innerHTML = players.map((p, i) => `
      <li class="${p.id === state.playerId ? "me" : ""}">
        <span class="lb-rank">#${i + 1}</span>
        <span>${p.avatar}</span>
        <span class="lb-name">${escapeHtml(p.name)}</span>
        <span class="lb-score">${p.score.toLocaleString("es-ES")}</span>
      </li>`).join("");
  }

  // ---------------- Glossary ----------------
  function renderGlossaryGrid() {
    const grid = el("glossary-grid");
    grid.innerHTML = "";
    DATA.GLOSSARY.forEach((g) => {
      const card = document.createElement("div");
      card.className = "glossary-term";
      card.innerHTML = `<div class="flip-inner">
        <div class="face front"><b>${escapeHtml(g.term)}</b><small>toca para traducir</small></div>
        <div class="face back"><b>${escapeHtml(g.es)}</b><small>${escapeHtml(g.def)}</small></div>
      </div>`;
      card.addEventListener("click", () => card.classList.toggle("flipped"));
      grid.appendChild(card);
    });
  }
  renderGlossaryGrid();

  el("btn-glossary").addEventListener("click", () => {
    if (Date.now() < state.glossaryLockedUntil) return;
    el("glossary-modal").classList.remove("hidden");
  });
  el("btn-close-glossary").addEventListener("click", () => el("glossary-modal").classList.add("hidden"));
  el("glossary-modal").addEventListener("click", (e) => {
    if (e.target.id === "glossary-modal") el("glossary-modal").classList.add("hidden");
  });

  function highlightGlossary(text) {
    let out = escapeHtml(text);
    const sorted = DATA.GLOSSARY.slice().sort((a, b) => b.term.length - a.term.length);
    sorted.forEach((g) => {
      const re = new RegExp("\\b(" + g.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\b", "i");
      if (re.test(out)) {
        out = out.replace(re, (m) => `<span class="term-hit" data-term="${escapeHtml(g.term)}">${m}</span>`);
      }
    });
    return out;
  }

  document.addEventListener("click", (e) => {
    const hit = e.target.closest(".term-hit");
    const pop = el("term-popover");
    if (hit) {
      const g = DATA.GLOSSARY.find((x) => x.term === hit.dataset.term);
      if (g) {
        pop.innerHTML = `<b>${escapeHtml(g.es)}</b><br>${escapeHtml(g.def)}`;
        const r = hit.getBoundingClientRect();
        pop.style.left = Math.min(window.innerWidth - 300, r.left) + "px";
        pop.style.top = (r.bottom + 8) + "px";
        pop.classList.remove("hidden");
      }
    } else if (!e.target.closest("#term-popover")) {
      pop.classList.add("hidden");
    }
  });

  // ---------------- Sound ----------------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    return audioCtx;
  }
  function playTone(freq, dur, type) {
    if (!state.soundOn) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }
  el("btn-sound").addEventListener("click", () => {
    state.soundOn = !state.soundOn;
    el("btn-sound").textContent = state.soundOn ? "🔊" : "🔇";
    if (state.soundOn) ensureAudio();
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------------- Ambient FX (radar sweep + starfield) ----------------
  (function ambientFx() {
    const canvas = el("fx-canvas");
    const ctx = canvas.getContext("2d");
    let w, h, stars = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      stars = Array.from({ length: Math.floor((w * h) / 9000) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + .2, s: Math.random() * .5 + .1
      }));
    }
    window.addEventListener("resize", resize);
    resize();

    let angle = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(180,230,255,0.55)";
      stars.forEach((st) => {
        ctx.globalAlpha = 0.4 + Math.sin((Date.now() / 900) * st.s) * 0.3;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const cx = w * 0.82, cy = h * 0.12, radius = Math.max(w, h) * 0.55;
      const grad = ctx.createConicGradient ? ctx.createConicGradient(angle, cx, cy) : null;
      if (grad) {
        grad.addColorStop(0, "rgba(0,229,255,0.20)");
        grad.addColorStop(0.06, "rgba(0,229,255,0.0)");
        grad.addColorStop(1, "rgba(0,229,255,0.0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduced) angle += 0.012;
      requestAnimationFrame(draw);
    }
    draw();
  })();

  function burstConfetti() {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none;width:100%;height:100%;";
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const colors = ["#00e5ff", "#ff9f1c", "#33ffb0", "#ff4d6d", "#eaf6ff"];
    const parts = Array.from({ length: 140 }, () => ({
      x: canvas.width / 2, y: canvas.height / 3,
      vx: (Math.random() - 0.5) * 12, vy: Math.random() * -10 - 4,
      g: 0.35, color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 6 + 3, life: 0
    }));
    let frame = 0;
    function step() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      parts.forEach((p) => {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.life++;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - p.life / 90);
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1;
      if (frame < 100) requestAnimationFrame(step);
      else canvas.remove();
    }
    step();
  }

  // ---------------- Keyboard shortcuts (1-4 to answer) ----------------
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-game").classList.contains("active")) return;
    const idx = { "1": 0, "2": 1, "3": 2, "4": 3 }[e.key];
    if (idx === undefined || state.answered) return;
    const btn = $$(".opt-btn")[idx];
    if (btn) btn.click();
  });

  renderCreateScreenMode();
})();
