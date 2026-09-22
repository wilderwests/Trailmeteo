window.NAVAL_MODALS_SYNC = (function () {
  "use strict";

  const GAME_DURATION_MS = 15 * 60 * 1000;
  const QUESTIONS_PER_ROOM = 18;
  const SLOT_MS = Math.floor(GAME_DURATION_MS / QUESTIONS_PER_ROOM);
  const ANSWER_WINDOW_MS = Math.floor(SLOT_MS * 0.78);
  const EVENT_EVERY_N_SLOTS = 3;

  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }

  function mulberry32(seedFn) {
    let a = seedFn();
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(arr, rng) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function shuffleQuestionOptions(question, rng) {
    const order = seededShuffle(question.options.map((_, i) => i), rng);
    return {
      ...question,
      options: order.map((i) => question.options[i]),
      correct: order.indexOf(question.correct)
    };
  }

  function buildSchedule(code) {
    const rng = mulberry32(hashSeed(String(code)));
    const data = window.NAVAL_MODALS_DATA;
    const questionOrder = seededShuffle(data.QUESTIONS, rng).slice(0, QUESTIONS_PER_ROOM);
    const eventOrder = seededShuffle(data.LIVE_EVENTS, rng);
    const slots = [];
    let eventCursor = 0;
    for (let i = 0; i < QUESTIONS_PER_ROOM; i++) {
      const hasEvent = i > 0 && i % EVENT_EVERY_N_SLOTS === 0;
      let event = null;
      if (hasEvent) {
        event = eventOrder[eventCursor % eventOrder.length];
        eventCursor++;
      }
      slots.push({
        index: i,
        startMs: i * SLOT_MS,
        answerEndMs: i * SLOT_MS + ANSWER_WINDOW_MS,
        endMs: (i + 1) * SLOT_MS,
        question: shuffleQuestionOptions(questionOrder[i], rng),
        event
      });
    }
    return { slots, totalMs: QUESTIONS_PER_ROOM * SLOT_MS };
  }

  function codeToRng(code) {
    return mulberry32(hashSeed(String(code) + "::room"));
  }

  function randomRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let out = "";
    for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // ---- Local adapter: syncs across tabs of the SAME browser via BroadcastChannel + localStorage ----
  function LocalAdapter() {
    this.mode = "local";
    this.channel = (typeof BroadcastChannel !== "undefined") ? new BroadcastChannel("naval-modals-room") : null;
    this.listeners = new Set();
    this.code = null;
    if (this.channel) {
      this.channel.onmessage = (ev) => {
        if (ev.data && ev.data.code === this.code) this._emit(ev.data.room);
      };
    }
  }
  LocalAdapter.prototype._key = function (code) { return "naval-modals-room:" + code; };
  LocalAdapter.prototype._read = function (code) {
    try { return JSON.parse(localStorage.getItem(this._key(code)) || "null"); } catch (e) { return null; }
  };
  LocalAdapter.prototype._write = function (code, room) {
    localStorage.setItem(this._key(code), JSON.stringify(room));
    if (this.channel) this.channel.postMessage({ code, room });
    this._emit(room);
  };
  LocalAdapter.prototype._emit = function (room) {
    this.listeners.forEach((fn) => fn(room));
  };
  LocalAdapter.prototype.createRoom = async function (hostName, avatar) {
    const code = randomRoomCode();
    const hostId = "p_" + Math.random().toString(36).slice(2, 10);
    const room = {
      code, status: "lobby", startAt: null,
      players: { [hostId]: { name: hostName, avatar, score: 0, streak: 0, correct: 0, answered: 0, joinedAt: Date.now() } }
    };
    this.code = code;
    this._write(code, room);
    return { code, playerId: hostId };
  };
  LocalAdapter.prototype.joinRoom = async function (code, name, avatar) {
    code = code.toUpperCase();
    const room = this._read(code);
    if (!room) throw new Error("NOT_FOUND");
    const playerId = "p_" + Math.random().toString(36).slice(2, 10);
    room.players[playerId] = { name, avatar, score: 0, streak: 0, correct: 0, answered: 0, joinedAt: Date.now() };
    this.code = code;
    this._write(code, room);
    return { code, playerId };
  };
  LocalAdapter.prototype.startGame = async function (code) {
    const room = this._read(code);
    if (!room) return;
    room.status = "playing";
    room.startAt = Date.now() + 3000;
    this._write(code, room);
  };
  LocalAdapter.prototype.updatePlayer = async function (code, playerId, patch) {
    const room = this._read(code);
    if (!room || !room.players[playerId]) return;
    Object.assign(room.players[playerId], patch);
    this._write(code, room);
  };
  LocalAdapter.prototype.endGame = async function (code) {
    const room = this._read(code);
    if (!room) return;
    room.status = "ended";
    this._write(code, room);
  };
  LocalAdapter.prototype.subscribe = function (code, fn) {
    this.code = code;
    this.listeners.add(fn);
    const room = this._read(code);
    if (room) fn(room);
    const poll = setInterval(() => {
      const r = this._read(code);
      if (r) fn(r);
    }, 1200);
    return () => { this.listeners.delete(fn); clearInterval(poll); };
  };

  // ---- Firebase adapter: true cross-device sync (requires window.FIREBASE_CONFIG) ----
  function FirebaseAdapter(config) {
    this.mode = "firebase";
    this.config = config;
    this.ready = this._init();
  }
  FirebaseAdapter.prototype._init = async function () {
    if (!window.firebase) {
      await new Promise((resolve, reject) => {
        const s1 = document.createElement("script");
        s1.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js";
        s1.onload = () => {
          const s2 = document.createElement("script");
          s2.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js";
          s2.onload = resolve;
          s2.onerror = reject;
          document.head.appendChild(s2);
        };
        s1.onerror = reject;
        document.head.appendChild(s1);
      });
    }
    if (!window.firebase.apps || !window.firebase.apps.length) {
      window.firebase.initializeApp(this.config);
    }
    this.db = window.firebase.database();
  };
  FirebaseAdapter.prototype.createRoom = async function (hostName, avatar) {
    await this.ready;
    const code = randomRoomCode();
    const ref = this.db.ref("rooms/" + code);
    const hostId = "p_" + Math.random().toString(36).slice(2, 10);
    await ref.set({
      status: "lobby", startAt: null,
      players: { [hostId]: { name: hostName, avatar, score: 0, streak: 0, correct: 0, answered: 0, joinedAt: Date.now() } }
    });
    return { code, playerId: hostId };
  };
  FirebaseAdapter.prototype.joinRoom = async function (code, name, avatar) {
    await this.ready;
    code = code.toUpperCase();
    const ref = this.db.ref("rooms/" + code);
    const snap = await ref.get();
    if (!snap.exists()) throw new Error("NOT_FOUND");
    const playerId = "p_" + Math.random().toString(36).slice(2, 10);
    await ref.child("players/" + playerId).set({ name, avatar, score: 0, streak: 0, correct: 0, answered: 0, joinedAt: Date.now() });
    return { code, playerId };
  };
  FirebaseAdapter.prototype.startGame = async function (code) {
    await this.ready;
    await this.db.ref("rooms/" + code).update({ status: "playing", startAt: Date.now() + 3000 });
  };
  FirebaseAdapter.prototype.updatePlayer = async function (code, playerId, patch) {
    await this.ready;
    await this.db.ref("rooms/" + code + "/players/" + playerId).update(patch);
  };
  FirebaseAdapter.prototype.endGame = async function (code) {
    await this.ready;
    await this.db.ref("rooms/" + code).update({ status: "ended" });
  };
  FirebaseAdapter.prototype.subscribe = function (code, fn) {
    let off = () => {};
    this.ready.then(() => {
      const ref = this.db.ref("rooms/" + code);
      const handler = (snap) => fn(snap.val());
      ref.on("value", handler);
      off = () => ref.off("value", handler);
    });
    return () => off();
  };

  function createAdapter() {
    const cfg = window.FIREBASE_CONFIG;
    if (cfg && cfg.databaseURL) return new FirebaseAdapter(cfg);
    return new LocalAdapter();
  }

  return {
    GAME_DURATION_MS, QUESTIONS_PER_ROOM, SLOT_MS, ANSWER_WINDOW_MS,
    buildSchedule, codeToRng, createAdapter, LocalAdapter, FirebaseAdapter
  };
})();
