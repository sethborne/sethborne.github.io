// Turntable: a 3D model you drag to turn, built from rendered frames
// (one image per step of a full orbit), optionally in phases that show a
// build-out over time. No 3D library: turning is swapping frames.
//
// Each frame can have an ID pass (one flat color per building, black
// background). It's never shown: it's drawn to a hidden canvas, and the
// pixel under a tap says which building was tapped (a "picking buffer").
// The same colors draw the orange highlight, which follows the building
// as the model turns, since its color is the same in every frame.
//
// Takes a node's title plus its content fields; `turntable` is the
// plain data from turntable() in content/helpers.js (settings listed
// there). Returns the <figure>. No fixed ids, so a page could hold two.
import {el} from '../../js/dom.js';
import ui from '../../content/ui.js';

// ---------- Pure helpers ----------

// 8-point compass, 45° apart
const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Camera heading in degrees (0 = north, 90 = east) at a frame
const headingAt = (frame, {frames, heading, clockwise}) => {
  const start = POINTS.indexOf(heading) * 45;
  const turn = ((frame * 360) / frames) * (clockwise ? 1 : -1);
  return (((start + turn) % 360) + 360) % 360;
};

// Nearest of the 8 points: 338° to 22° is N, 23° to 67° NE, and so on
const pointOf = (deg) => POINTS[Math.round(deg / 45) % 8];

const wrap = (i, frames) => ((i % frames) + frames) % frames;

const pad = (n) => String(n).padStart(2, '0');

// img/turntable/phase_a/base_00.jpg, .../color_00.png
const frameUrl = (base, phase, pass, i) =>
  `${base}phase_${phase}/${pass}_${pad(i)}.${pass === 'base' ? 'jpg' : 'png'}`;

// Load order for a phase: the current frame, then outward both ways, so a
// drag in either direction finds frames ready
const outward = (from, frames) => {
  const order = [from];
  for (let k = 1; k <= frames / 2; k++) order.push(wrap(from + k, frames), wrap(from - k, frames));
  return [...new Set(order)];
};

// A frame's file, kept compressed (a JPG frame is ~100 KB as a Blob,
// ~3 MB once decoded), so every phase can stay downloaded without
// filling memory
const fetchBlob = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.blob();
};

// Decoded frames kept at once: enough for a drag around the current
// angle (DECODE_AHEAD each way); older ones are freed. Render frames
// are ~3 MB decoded, ID frames ~0.8 MB.
// (+ the current angle in each other phase, for instant phase switches)
const KEEP = {base: 24, color: 4};
const DECODE_AHEAD = 6;

// A pixel is a building if any channel is above this (background is black)
const BLACK = 40;
// How far a pixel may be from the tapped color and still be the same
// building: the source ID pass went through JPG, so colors are a bit noisy
const TOLERANCE = 48;
const distance = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// The pop-up entry whose color is nearest the tapped one (within
// TOLERANCE), from turntable.buildings ({'#00ff00': {title, text}})
const buildingFor = (rgb, buildings) =>
  Object.entries(buildings)
    .map(([hex, info]) => ({info, d: distance(rgb, hexToRgb(hex))}))
    .filter(({d}) => d <= TOLERANCE)
    .sort((a, b) => a.d - b.d)[0]?.info ?? null;

// Phase buttons borrow existing styles: pills are the filter chips, tabs
// are the Projects section's View tabs; the timeline is turntable.css
const LOOKS = {
  pills: {list: '', button: 'filter-chip'},
  tabs: {list: 'view-tab-list', button: 'view-tab'},
  timeline: {list: 'tt-timeline', button: 'tt-step'},
};

// The needle points at north on screen, so it turns opposite the camera
const createNeedle = () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('class', 'tt-needle');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of [
    ['circle', {cx: 10, cy: 10, r: 9, class: 'tt-needle-ring'}],
    ['path', {d: 'M10 2.5 13 10H7z', class: 'tt-needle-north'}],
    ['path', {d: 'M10 17.5 7 10h6z', class: 'tt-needle-south'}],
  ]) {
    const shape = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attrs)) shape.setAttribute(name, value);
    svg.append(shape);
  }
  return svg;
};

// ---------- Component ----------

// Turntables made so far, for unique ids
let created = 0;

// How long each loading line shows before the next
const LINE_MS = 1800;

export const createTurntable = ({title, turntable: options, tryThis}) => {
  const {base, frames, phases, aspect, alt, controls, drag, angle, highlight, popups, buildings, whimsy, loadingText, loadingLines} = options;
  const look = LOOKS[controls] ?? LOOKS.pills;
  const tappable = highlight || popups;
  const dir = drag === 'reverse' ? -1 : 1;

  let phase = 0;
  let frame = 0;
  let selected = null; // [r, g, b] of the tapped building
  const cache = Object.fromEntries(phases.map((id) => [id, {base: [], color: [], loading: null, ready: false}]));
  const current = () => cache[phases[phase]];

  // ----- Elements -----
  const canvas = el('canvas', {class: 'tt-base'});
  const hi = el('canvas', {class: 'tt-highlight'});
  // Same ring as the first-load spinner (.loader-ring, loader.css). The
  // whimsical line is for the eyes only: a status region that changed
  // every couple of seconds would keep interrupting screen readers, so
  // they hear the plain message once.
  const loadingLine = el('span', {class: 'tt-loading-text', 'aria-hidden': 'true'});
  const loading = el(
    'div',
    {class: 'tt-loading', role: 'status'},
    el('span', {class: 'loader-ring', 'aria-hidden': 'true'}),
    loadingLine,
    el('span', {class: 'visually-hidden'}, loadingText),
  );
  const angleText = el('span');
  const needle = angle === 'compass' ? createNeedle() : null;
  const badge = angle !== 'off' && el('span', {class: 'tt-angle'}, needle, angleText);
  const hint = el('span', {class: 'tt-hint'}, tappable ? ui.turntable.hintTap : ui.turntable.hint);
  const popupTitle = el('h3');
  const popupText = el('p');
  const popupClose = el('button', {class: 'tt-popup-close', type: 'button', 'aria-label': 'Close'}, '×');
  const popup = el('div', {class: 'tt-popup', role: 'dialog', 'aria-label': 'Building details', hidden: true}, popupClose, popupTitle, popupText);
  const stage = el(
    'div',
    {class: 'tt-stage', tabindex: '0', role: 'img', 'aria-roledescription': 'turntable', style: `aspect-ratio: ${aspect}`},
    canvas, hi, loading, badge, hint, popup,
  );
  const baseCtx = canvas.getContext('2d');
  const hiCtx = hi.getContext('2d');
  // Offscreen canvas for reading the ID pass
  const pick = document.createElement('canvas');
  const pickCtx = pick.getContext('2d', {willReadFrequently: true});

  // ----- Loading -----
  // A phase downloads the first time it's shown (or warms up in the
  // background, see Start), and its files stay, compressed. Until all
  // its frames are in, the spinner covers the frame and turning waits.
  // Frames are decoded only near the current angle (Decoding, below).
  const ready = () => current().ready;

  // Whimsy on and lines to pick from: a random line, never the one
  // already showing, rotating. Otherwise the plain loadingText.
  const whimsical = whimsy && loadingLines?.length > 0;
  const nextLine = () => {
    const others = loadingLines.filter((line) => line !== loadingLine.textContent);
    loadingLine.textContent = others[Math.floor(Math.random() * others.length)] ?? loadingLines[0];
  };
  let lineTimer = null;

  const showLoading = () => {
    const show = !ready();
    loading.hidden = !show;
    stage.classList.toggle('is-loading', show);
    clearInterval(lineTimer);
    lineTimer = null;
    if (!show) return;
    if (!whimsical) {
      loadingLine.textContent = loadingText;
      return;
    }
    nextLine();
    // One line is just shown, no rotation
    if (loadingLines.length > 1) lineTimer = setInterval(nextLine, LINE_MS);
  };

  const loadPhase = (index) => {
    const id = phases[index];
    const store = cache[id];
    if (store.loading) return store.loading;
    store.loading = Promise.all(
      outward(frame, frames).map(async (i) => {
        const [b, c] = await Promise.all([
          fetchBlob(frameUrl(base, id, 'base', i)),
          fetchBlob(frameUrl(base, id, 'color', i)).catch(() => null), // the ID pass is optional
        ]);
        store.base[i] = b;
        store.color[i] = c;
        // The current frame shows under the spinner as soon as it's in
        if (index === phase && i === frame) draw();
      }),
    )
      .catch((err) => console.warn(`Turntable: a frame in phase ${id} failed to load`, err))
      // Even after a failure: the nearest loaded frames stand in
      .finally(() => {
        store.ready = true;
        if (index === phase) showLoading();
      });
    return store.loading;
  };

  // ----- Decoding -----
  // Decoded frames (ImageBitmap) by 'phase|pass|frame'. A Map keeps
  // insertion order, so re-inserting on use makes the first key the
  // least recently used: that's the one freed (close()) past KEEP.
  const decoded = new Map();
  const pending = new Map();
  const keyOf = (p, pass, i) => `${p}|${pass}|${i}`;

  const touch = (key) => {
    const bitmap = decoded.get(key);
    decoded.delete(key);
    decoded.set(key, bitmap);
    return bitmap;
  };

  const trim = (pass) => {
    const keys = [...decoded.keys()].filter((key) => key.includes(`|${pass}|`));
    for (const key of keys.slice(0, Math.max(0, keys.length - KEEP[pass]))) {
      decoded.get(key).close();
      decoded.delete(key);
    }
  };

  // The decoded frame if it's ready, else null (no waiting)
  const peek = (p, pass, i) => (decoded.has(keyOf(p, pass, i)) ? touch(keyOf(p, pass, i)) : null);

  // Decode a frame (once, however often it's asked for); null if its
  // file isn't in yet
  const decode = (p, pass, i) => {
    const key = keyOf(p, pass, i);
    if (decoded.has(key)) return Promise.resolve(touch(key));
    if (pending.has(key)) return pending.get(key);
    const blob = cache[phases[p]][pass][i];
    if (!blob) return Promise.resolve(null);
    const job = createImageBitmap(blob)
      .then((bitmap) => {
        decoded.set(key, bitmap);
        trim(pass);
        return bitmap;
      })
      .catch(() => null)
      .finally(() => pending.delete(key));
    pending.set(key, job);
    return job;
  };

  // ----- Picking -----
  // The current frame's ID pass as pixels, read once per frame; null
  // until it's decoded (ensureColor decodes it)
  let pickKey = null;
  let pickData = null;
  const colorData = () => {
    const key = keyOf(phase, 'color', frame);
    if (key === pickKey) return pickData;
    const bitmap = peek(phase, 'color', frame);
    if (!bitmap) return null;
    pick.width = bitmap.width;
    pick.height = bitmap.height;
    pickCtx.drawImage(bitmap, 0, 0);
    pickKey = key;
    pickData = pickCtx.getImageData(0, 0, pick.width, pick.height);
    return pickData;
  };
  const ensureColor = () => decode(phase, 'color', frame);

  const colorAt = (clientX, clientY) => {
    const data = colorData();
    if (!data) return null;
    const rect = stage.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * data.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * data.height);
    const p = (y * data.width + x) * 4;
    const rgb = [data.data[p], data.data[p + 1], data.data[p + 2]];
    return Math.max(...rgb) > BLACK ? rgb : null;
  };

  // Orange wash over every pixel of the selected building's color
  const drawHighlight = () => {
    if (!selected || !highlight) {
      hiCtx.clearRect(0, 0, hi.width, hi.height);
      return;
    }
    const data = colorData();
    if (!data) {
      // Not decoded yet: draw it once it is, if still on this frame
      const at = keyOf(phase, 'color', frame);
      ensureColor().then(() => at === keyOf(phase, 'color', frame) && colorData() && drawHighlight());
      return;
    }
    hi.width = data.width;
    hi.height = data.height;
    const out = hiCtx.createImageData(data.width, data.height);
    const d = data.data;
    for (let p = 0; p < d.length; p += 4) {
      if (distance(selected, [d[p], d[p + 1], d[p + 2]]) <= TOLERANCE) {
        out.data.set([255, 150, 0, 140], p);
      }
    }
    hiCtx.putImageData(out, 0, 0);
  };

  // ----- Drawing -----
  const label = () =>
    [alt, phases.length > 1 && ui.turntable.phase(phases[phase]), 'Drag or use the arrow keys to turn it.']
      .filter(Boolean)
      .join('. ');

  const drawAngle = () => {
    if (!badge) return;
    const deg = headingAt(frame, options);
    angleText.textContent =
      angle === 'degrees' ? `${frame * (360 / frames)}°` : ui.turntable.facing(pointOf(deg));
    if (needle) needle.style.transform = `rotate(${-deg}deg)`;
  };

  const paint = (bitmap) => {
    // A bitmap freed by trim() in the meantime has width 0: skip it
    if (!bitmap.width) return;
    if (canvas.width !== bitmap.width) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    baseCtx.drawImage(bitmap, 0, 0);
  };

  // The current frame if it's decoded; if not, it's painted the moment it
  // decodes. While dragging (standIn), the nearest decoded frame a few
  // steps away fills in meanwhile, so a fast drag never stalls. On a
  // phase switch there's no stand-in: another angle would make the model
  // jump, so the old phase stays up at the same angle until the new one
  // is ready. Frames on either side are decoded ahead.
  const draw = ({standIn = true} = {}) => {
    const p = phase;
    const i = frame;
    const exact = peek(p, 'base', i);
    if (exact) {
      paint(exact);
    } else {
      for (let k = 1; standIn && k <= DECODE_AHEAD; k++) {
        const near = peek(p, 'base', wrap(i + k, frames)) ?? peek(p, 'base', wrap(i - k, frames));
        if (near) {
          paint(near);
          break;
        }
      }
      decode(p, 'base', i).then((bitmap) => bitmap && p === phase && i === frame && paint(bitmap));
    }
    for (let k = 1; k <= DECODE_AHEAD; k++) {
      decode(p, 'base', wrap(i + k, frames));
      decode(p, 'base', wrap(i - k, frames));
    }
    drawAngle();
    drawHighlight();
  };

  // The current angle in every other downloaded phase, decoded ahead,
  // so the next phase switch is instant. Run when turning stops.
  const warmPhases = () => {
    phases.forEach((id, p) => {
      if (p !== phase && cache[id].base[frame]) decode(p, 'base', frame);
    });
  };

  const setFrame = (i) => {
    frame = wrap(i, frames);
    draw();
  };

  // ----- Selection -----
  const clearSelection = () => {
    selected = null;
    popup.hidden = true;
    drawHighlight();
  };

  const select = (rgb, clientX, clientY) => {
    selected = rgb;
    const info = popups && buildingFor(rgb, buildings);
    popup.hidden = !info;
    if (info) {
      popupTitle.textContent = info.title;
      popupText.textContent = info.text ?? '';
      // Keep it inside the frame
      const rect = stage.getBoundingClientRect();
      popup.style.left = `${Math.min(Math.max(clientX - rect.left, 120), rect.width - 120)}px`;
      popup.style.top = `${Math.max(clientY - rect.top, 150)}px`;
    }
    drawHighlight();
  };

  popupClose.addEventListener('click', () => {
    clearSelection();
    stage.focus();
  });
  popup.addEventListener('pointerdown', (e) => e.stopPropagation());

  // ----- Phase buttons -----
  const progress = controls === 'timeline' && el('span', {class: 'tt-progress'});
  const buttons = phases.map((id, i) => {
    const text = ui.turntable.phase(id);
    const button = el('button', {type: 'button', class: look.button, 'data-label': text, 'aria-pressed': 'false'}, el('span', {}, text));
    button.addEventListener('click', () => setPhase(i));
    return button;
  });
  // Unique per turntable, so two on a page don't share a label
  const labelId = `tt-phases-${++created}`;
  const phaseControls =
    phases.length > 1 &&
    el(
      'div',
      {class: `tt-phases look-${controls}`, role: 'group', 'aria-labelledby': labelId},
      el('span', {class: 'filter-label view-label', id: labelId}, ui.turntable.phases),
      el('div', {class: `tt-phase-list ${look.list}`, style: `--steps: ${phases.length}`}, progress, buttons),
    );

  const setPhase = (i) => {
    phase = i;
    buttons.forEach((button, k) => {
      button.setAttribute('aria-pressed', String(k === i));
      button.classList.toggle('is-built', k < i);
    });
    // The track spans 100% minus half a column at each end (turntable.css)
    if (progress) progress.style.width = `${(i / (phases.length - 1)) * (100 - 100 / phases.length)}%`;
    stage.setAttribute('aria-label', label());
    loadPhase(i);
    showLoading();
    draw({standIn: false});
    warmPhases();
    // A building picked in another phase may not exist in this one
    if (selected) {
      ensureColor().then(() => {
        const data = i === phase && selected && colorData();
        if (!data) return;
        const d = data.data;
        let found = false;
        for (let p = 0; p < d.length && !found; p += 16) found = distance(selected, [d[p], d[p + 1], d[p + 2]]) <= TOLERANCE;
        if (!found) clearSelection();
      });
    }
  };

  // ----- Drag, tap, keys -----
  // One full turn per stage width and a half: about 20px a frame on a laptop
  let dragging = null;
  const hideHint = () => hint.classList.add('is-gone');

  stage.addEventListener('pointerdown', (e) => {
    // Turning and tapping wait until the phase's frames are in
    if (e.button !== 0 || !ready()) return;
    dragging = {x: e.clientX, start: frame, moved: false, id: e.pointerId};
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) {
      if (tappable && e.pointerType === 'mouse' && ready()) {
        // The first hover on a frame decodes its ID pass; later moves read it
        if (!colorData()) ensureColor();
        stage.classList.toggle('is-over-building', !!colorAt(e.clientX, e.clientY));
      }
      return;
    }
    const dx = e.clientX - dragging.x;
    if (!dragging.moved && Math.abs(dx) > 6) {
      dragging.moved = true;
      stage.setPointerCapture(dragging.id);
      stage.classList.add('is-dragging');
      popup.hidden = true;
      hideHint();
    }
    if (dragging.moved) {
      const perFrame = (stage.clientWidth * 1.5) / frames;
      setFrame(dragging.start - dir * Math.round(dx / perFrame));
    }
  });
  const endDrag = (e) => {
    if (!dragging) return;
    const wasTap = !dragging.moved;
    stage.classList.remove('is-dragging');
    dragging = null;
    if (!wasTap) warmPhases();
    if (wasTap && e.type === 'pointerup' && tappable) {
      hideHint();
      const {clientX, clientY} = e;
      // On a phone the ID pass isn't decoded until the first tap
      ensureColor().then(() => {
        const rgb = colorAt(clientX, clientY);
        if (rgb) select(rgb, clientX, clientY);
        else clearSelection();
      });
    }
  };
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 6 : 1;
    const turn = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
    if (turn && !ready()) return;
    if (turn) {
      setFrame(frame + turn);
      warmPhases();
    } else if (e.key === 'Escape') clearSelection();
    else return;
    e.preventDefault();
    hideHint();
  });

  // ----- Start -----
  setPhase(0);
  // setPhase(0) started the first phase loading. The next phase warms up
  // quietly once the first is in, but only after the turntable has come
  // near the screen, so a visitor who never scrolls to it pays for one.
  const startWhenSeen = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      startWhenSeen.disconnect();
      if (phases.length > 1) cache[phases[0]].loading?.then(() => loadPhase(1));
    },
    {rootMargin: '200px'},
  );
  startWhenSeen.observe(stage);

  return el(
    'figure',
    {class: 'turntable'},
    stage,
    phaseControls,
    tryThis &&
      el('figcaption', {class: 'embed-caption'}, el('p', {class: 'embed-try'}, el('strong', {}, `${ui.embed.tryThis}: `), tryThis)),
  );
};
