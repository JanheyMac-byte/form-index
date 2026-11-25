"use strict";

const categories = {
  visual: "視覺靈感",
  graphic: "平面與品牌",
  ux: "UI/UX",
  web: "網頁設計",
  aesthetic: "審美網頁",
  type: "字體與排版",
  other: "其他"
};

const makeSite = ([id, name, url, category, description, mark]) => ({ id, name, url, category, description, mark });
const featuredSites = [
  ["pinterest","Pinterest","https://ca.pinterest.com/","visual","蒐集圖片參考，整理自己的靈感板。","P"],
  ["museum","Museum Department","https://museumdepartment.com/","graphic","瀏覽當代平面設計與字體項目。","M"],
  ["figma","Figma Community","https://www.figma.com/community","ux","查找 UI 套件、設計系統和插件。","F"],
  ["mobbin","Mobbin","https://mobbin.com/","ux","參考真實產品的界面與用戶流程。","M"],
  ["awwwards","Awwwards","https://www.awwwards.com/","web","發現互動體驗與網頁設計案例。","A."],
  ["siteinspire","Siteinspire","https://www.siteinspire.com/","web","按風格、類型和主題尋找網站參考。","Si"],
  ["fonts","Fonts In Use","https://fontsinuse.com/","type","研究字體在真實作品中的用法與搭配。","Aa"],
  ["arena","Are.na","https://www.are.na/","visual","通過主題頻道探索圖像、文本和研究素材。","A"],
  ["behance","Behance","https://www.behance.net/","graphic","瀏覽品牌、平面和編輯設計項目。","Bē"]
].map(makeSite);
const aestheticSites = [
  ["ordinary-people","Ordinary People","https://ordinarypeople.info/work","aesthetic","看韓國設計工作室如何用大膽排版、影像和動效呈現品牌項目。","OP"],
  ["studio-dumbar","Studio Dumbar","https://studiodumbar.com/work","aesthetic","參考以動態字體、色彩和編排呈現視覺識別作品的項目索引。","SD"],
  ["eames-institute","Eames Institute","https://www.eamesinstitute.org/collection/","aesthetic","參考設計檔案的產品攝影、留白和藏品編排。","EI"],
  ["koto","Koto","https://koto.com/","aesthetic","參考大字號排版、明快配色和品牌案例的圖文節奏。","K"]
].map(makeSite);
const seed = [...featuredSites, ...aestheticSites];
const aestheticIds = new Set(aestheticSites.map(site => site.id));
const legacyDescriptions = {
  "pinterest": "搜集图片参考，整理自己的灵感板。",
  "museum": "浏览当代平面设计与字体项目。",
  "figma": "查找 UI 套件、设计系统和插件。",
  "mobbin": "参考真实产品的界面与用户流程。",
  "awwwards": "发现互动体验与网页设计案例。",
  "siteinspire": "按风格、类型和主题寻找网站参考。",
  "fonts": "研究字体在真实作品中的用法与搭配。",
  "arena": "通过主题频道探索图像、文本和研究素材。",
  "behance": "浏览品牌、平面和编辑设计项目。",
  "ordinary-people": "看韩国设计工作室如何用大胆排版、影像和动效呈现品牌项目。",
  "studio-dumbar": "参考以动态字体、色彩和编排呈现视觉识别作品的项目索引。",
  "eames-institute": "参考设计档案的产品摄影、留白和藏品编排。",
  "koto": "参考大字号排版、明快配色和品牌案例的图文节奏。"
};

const icons = {
  bookmark: '<path d="M6 5.5A1.5 1.5 0 0 1 7.5 4h9A1.5 1.5 0 0 1 18 5.5V21l-6-4-6 4z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.3 15.3 4.2 4.2"/>',
  settings: '<path d="M4 7h8m4 0h4M4 17h3m4 0h9"/><circle cx="14" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 4v15m-6-6 6 6 6-6"/>',
  up: '<path d="M12 20V5m-6 6 6-6 6 6"/>',
  left: '<path d="m14.5 5-7 7 7 7"/>',
  right: '<path d="m9.5 5 7 7-7 7"/>',
  external: '<path d="M6 18 18 6m-9 0h9v9"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/>'
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const icon = name => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
const bundledPreviews = {};
const defaultFigma = "https://www.figma.com/";
const storageKey = "form-index.settings.v1";
const catalogVersion = 1;
const darkMode = matchMedia("(prefers-color-scheme: dark)");
const escapeText = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function readState() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(storageKey));
  } catch {
    saved = null;
  }
  const savedSites = Array.isArray(saved?.sites) ? saved.sites : null;
  const needsCatalogUpdate = savedSites && (saved.catalogVersion ?? 0) < catalogVersion;
  let sites = (savedSites ?? seed).map(site => {
    const preset = seed.find(item => item.id === site.id);
    if (preset && site.description === legacyDescriptions[site.id]) {
      return { ...site, description: preset.description };
    }
    return site;
  });
  const needsDescriptionUpdate = savedSites && sites.some((site, index) => site !== savedSites[index]);
  if (needsCatalogUpdate) {
    const ids = new Set(savedSites.map(site => site.id));
    const urls = new Set(savedSites.map(site => normalizeUrl(site.url)));
    sites = [...sites, ...aestheticSites.filter(site => !ids.has(site.id) && !urls.has(site.url))];
  }
  const settings = {
    sites,
    favorites: saved?.favorites ?? [],
    theme: saved?.theme ?? "light",
    view: saved?.view ?? "grid",
    sort: saved?.sort ?? "manual",
    figma: saved?.figma ?? "",
    catalogVersion
  };
  if (needsCatalogUpdate || needsDescriptionUpdate) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch {
      // Use the updated catalog for this session if storage is unavailable.
    }
  }
  return settings;
}

let state = readState();
let page = "discover";
let category = "all";
let editingId = null;
let removingId = null;
let actionId = null;
let noticeTimer;
let previewId = "museum";
let previewQueue = [];
let previewDeck = [];
let orbitPosition = 0;
let orbitFrame = 0;
let orbitLayout;
let orbitPhase = 0;
let orbitInView = false;
let idleFrame = 0;
let idleTime = 0;
let idleRamp = 0;
let idleAfter = 0;
let hoverId = null;
let orbitPointer = null;
const previewNodes = new Map();
let previewFavorites = "";
let previewDrag = null;
let suppressPreviewClick = false;
let previewTilt = null;
let previewTiltFrame = 0;
const previewTrack = $("#preview-track");
const orbitScene = $("#website-orbit");
const sculptureCanvas = $(".sculpture-render");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const maxPreviewTilt = 12;
const turnDuration = 48000;
const orbitEntryAngle = 2.36;
const fullTurn = 2 * Math.PI;
const navigation = $(".main-nav");
const navButtons = $$(".main-nav button[data-page]");
const navIndicator = $(".nav-indicator");
let activeNavButton = null;
let navAnimation = null;

function update(next, message) {
  state = { ...state, ...next };
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    message = "此瀏覽器無法保存，變更僅在當前頁面生效。";
  }
  render();
  if (message) notify(message);
}

function notify(message) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.classList.add("is-visible");
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove("is-visible"), 2300);
}

function normalizeUrl(value) {
  const input = value.trim();
  if (!input || /\s/.test(input)) return "";
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input) ? input : "https://" + input);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname.includes(".") || url.username || url.password) return "";
    return url.href;
  } catch {
    return "";
  }
}

function domain(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function openLink(site) {
  return 'href="' + escapeText(site.url) + '" target="_blank" rel="noopener noreferrer"';
}

function avatar(site) {
  const letters = Array.from(site.name).slice(0, 2).join("");
  return '<span class="resource-avatar" aria-hidden="true">' + escapeText(site.mark || letters) + '</span>';
}

function saveButton(site, className = "") {
  const saved = state.favorites.includes(site.id);
  const label = (saved ? "取消收藏 " : "收藏 ") + site.name;
  return '<button type="button" class="icon-btn quiet small save-btn ' + className +
    '" data-save="' + escapeText(site.id) + '" aria-pressed="' + saved + '" title="' + escapeText(label) +
    '" aria-label="' + escapeText(label) + '">' + icon("bookmark") + '</button>';
}

function previewCard(site) {
  const imageUrl = site.preview || bundledPreviews[site.id] || (seed.some(item => item.id === site.id) ? "./assets/previews/" + site.id + ".jpg" : "");
  const mark = site.mark || Array.from(site.name).slice(0, 2).join("");
  const image = imageUrl ? '<img src="' + escapeText(imageUrl) + '" alt="" decoding="async" draggable="false" referrerpolicy="no-referrer">' : "";
  return '<article class="preview-slide" data-preview-id="' + escapeText(site.id) +
    '" aria-label="' + escapeText(site.name) + '"><div class="preview-card-shell"><div class="preview-card">' +
    '<a class="preview-picture' + (site.id === "museum" ? " is-museum" : "") + '" ' + openLink(site) +
    ' aria-label="打開 ' + escapeText(site.name) + '"><span class="preview-blockmark" aria-hidden="true">' + escapeText(mark) +
    '</span>' + image + '</a>' +
    '<div class="preview-body"><h3><a ' + openLink(site) + '>' + escapeText(site.name) + '</a></h3>' +
    '<p>' + escapeText(domain(site.url)) + ' · ' + categories[site.category] + '</p></div>' +
    saveButton(site, "preview-save") + '<span class="preview-edge" aria-hidden="true"></span></div></div></article>';
}

function previewTiltAngles(x, y, bounds) {
  const horizontal = (x - bounds.left) / (bounds.width / 2) - 1;
  const vertical = (y - bounds.top) / (bounds.height / 2) - 1;
  const limit = maxPreviewTilt / Math.max(1, Math.hypot(horizontal, vertical));
  return { x: -vertical * limit, y: horizontal * limit };
}

function resetPreviewTilt() {
  if (previewTiltFrame) {
    cancelAnimationFrame(previewTiltFrame);
    previewTiltFrame = 0;
  }
  if (!previewTilt) return;
  const { card } = previewTilt;
  card.classList.remove("is-tilting");
  card.style.removeProperty("--preview-tilt-x");
  card.style.removeProperty("--preview-tilt-y");
  previewTilt = null;
}

function followPreviewPointer(event) {
  const shell = event.target.closest(".preview-card-shell");
  const slide = shell?.closest(".preview-slide");
  if (!slide || slide.dataset.previewId !== hoverId || event.pointerType !== "mouse" || event.buttons || reduceMotion.matches) {
    resetPreviewTilt();
    return;
  }
  if (previewTilt?.shell !== shell) {
    resetPreviewTilt();
    previewTilt = { shell, card: shell.firstElementChild };
  }
  previewTilt.x = event.clientX;
  previewTilt.y = event.clientY;
  if (previewTiltFrame) return;
  previewTiltFrame = requestAnimationFrame(() => {
    previewTiltFrame = 0;
    const { shell, card, x, y } = previewTilt;
    const bounds = shell.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const angles = previewTiltAngles(x, y, bounds);
    card.classList.add("is-tilting");
    card.style.setProperty("--preview-tilt-x", angles.x.toFixed(2) + "deg");
    card.style.setProperty("--preview-tilt-y", angles.y.toFixed(2) + "deg");
  });
}

function ringIndex(index, length) {
  return ((index % length) + length) % length;
}

function unit(value) {
  return Math.max(0, Math.min(1, value));
}

function mix(from, to, amount) {
  return from + (to - from) * amount;
}

function smoothRange(value, start, end) {
  const fraction = unit((value - start) / (end - start));
  return fraction * fraction * (3 - 2 * fraction);
}

function ringPoint(angle) {
  const { radiusX, radiusY, slope } = orbitLayout;
  const depth = Math.cos(angle);
  const x = radiusX * Math.sin(angle);
  return { x, y: radiusY * depth - x * slope, depth, yaw: -Math.sin(angle) * 31 };
}

function bezier(from, firstHandle, secondHandle, to, progress) {
  const inverse = 1 - progress;
  return inverse ** 3 * from + 3 * inverse ** 2 * progress * firstHandle
    + 3 * inverse * progress ** 2 * secondHandle + progress ** 3 * to;
}

function entryPoint(angle, order, count) {
  const { width, height, cardWidth, radiusX, radiusY, slope } = orbitLayout;
  const delay = .48 * order / Math.max(1, count - 1);
  const progress = unit((orbitPhase - delay) / (1 - delay));
  const inletLength = 1.25;
  const arcLength = ringIndex(angle - orbitEntryAngle, fullTurn);
  const travel = (inletLength + arcLength) * progress * (1 + .85 * progress * (1 - progress));
  if (progress === 1) return ringPoint(angle);
  if (travel >= inletLength) return ringPoint(orbitEntryAngle + travel - inletLength);

  const rear = ringPoint(orbitEntryAngle);
  const feed = travel / inletLength;
  const startX = width * .52 + cardWidth * .34;
  const startY = -height * .39;
  // Match the Bézier tangent to the ellipse as the card reaches its back arc.
  const tangentX = radiusX * rear.depth;
  const tangentY = -radiusY * Math.sin(orbitEntryAngle) - tangentX * slope;
  return {
    x: bezier(startX, startX - cardWidth * .52, rear.x - tangentX * inletLength / 3, rear.x, feed),
    y: bezier(startY, startY + height * .105, rear.y - tangentY * inletLength / 3, rear.y, feed),
    depth: rear.depth,
    yaw: mix(-7, rear.yaw, smoothRange(feed, 0, 1)),
    opacity: smoothRange(feed, .02, .65),
    size: mix(.84, 1, smoothRange(feed, 0, 1))
  };
}

function previewScale(depth) {
  return .79 + depth * .21 + .075 * smoothRange(depth, .77, 1);
}

function measureOrbit() {
  const width = previewTrack.clientWidth;
  const height = previewTrack.clientHeight;
  if (!width || !height) return;
  const compact = width <= 640;
  const radiusX = Math.min(525, width * (compact ? .328 : .347));
  const radiusY = Math.min(194, height * (compact ? .204 : .216));
  const slope = compact ? .19 : .13;
  const slots = compact ? 7 : 9;
  const cardWidth = compact ? Math.max(92, Math.min(width * .29, 154)) : Math.max(122, Math.min(width * .154, 216));
  orbitLayout = { width, height, radiusX, radiusY, slope, slots, cardWidth };
  orbitScene.style.setProperty("--orbit-line-width", radiusX * 2 + "px");
  orbitScene.style.setProperty("--orbit-line-height", radiusY * 2 + "px");
  orbitScene.style.setProperty("--orbit-skew", -Math.atan(slope) * 180 / Math.PI + "deg");
  paintOrbit();
}

function getPreviewNode(site) {
  if (previewNodes.has(site.id)) return previewNodes.get(site.id);
  const template = document.createElement("template");
  template.innerHTML = previewCard(site);
  const node = template.content.firstElementChild;
  const img = node.querySelector("img");
  if (img) img.addEventListener("error", () => img.remove(), { once: true });
  previewNodes.set(site.id, node);
  previewTrack.append(node);
  return node;
}

function paintOrbit() {
  if (!orbitLayout || !previewDeck.length) return;
  const { slots } = orbitLayout;
  const count = Math.min(slots, previewDeck.length);
  const centerIndex = Math.round(orbitPosition);
  const step = fullTurn / count;
  const leading = centerIndex - Math.floor((count - 1) / 2);
  const entering = orbitPhase < 1;
  const firstAfterEntry = Math.ceil(orbitEntryAngle / step + orbitPosition);
  const centerScale = previewScale(Math.cos((centerIndex - orbitPosition) * step));
  const visible = new Set();
  for (let index = leading; index < leading + count; index++) {
    const site = previewDeck[ringIndex(index, previewDeck.length)];
    const slot = index - orbitPosition;
    const angle = slot * step;
    const order = ringIndex(firstAfterEntry - 1 - index, count);
    const { x, y, depth, yaw, opacity = 1, size = 1 } = entering
      ? entryPoint(angle, order, count) : ringPoint(angle);
    const front = depth >= 0;
    const active = index === centerIndex;
    const scale = previewScale(depth) * size;
    const node = getPreviewNode(site);

    node.style.setProperty("--orbit-x", x.toFixed(2) + "px");
    node.style.setProperty("--orbit-y", y.toFixed(2) + "px");
    node.style.setProperty("--orbit-yaw", yaw.toFixed(2) + "deg");
    node.style.setProperty("--preview-scale", scale.toFixed(3));
    node.style.setProperty("--preview-hover-scale", Math.max(1, Math.min(1.085, (centerScale - .012) / scale)).toFixed(3));
    const nearSide = smoothRange(depth, -.3, .2);
    node.style.setProperty("--preview-brightness", mix(.93, 1, nearSide).toFixed(3));
    node.style.setProperty("--orbit-card-opacity", (opacity * mix(.73, 1, nearSide)).toFixed(3));
    node.style.setProperty("--preview-rim-opacity", smoothRange(depth, .65, .98).toFixed(3));
    node.style.zIndex = String(front ? 42 + Math.round(depth * 19) : 15 + Math.round((depth + 1) * 13));
    if (node.hasAttribute("data-rear") === front) {
      node.toggleAttribute("data-rear", !front);
      for (const control of node.querySelectorAll("a, button")) control.tabIndex = front ? 0 : -1;
    }
    if (node.getAttribute("aria-current") !== String(active)) {
      node.setAttribute("aria-current", String(active));
      node.querySelector(".preview-picture").setAttribute("aria-label", (active ? "打開 " : "移到星環前方 ") + site.name);
    }
    node.toggleAttribute("data-orbit-hover", !active && site.id === hoverId);
    visible.add(site.id);
  }
  for (const [id, node] of previewNodes) {
    if (visible.has(id)) continue;
    node.remove();
    previewNodes.delete(id);
  }
}

function isObscured(slide, x, y) {
  return slide.hasAttribute("data-rear") && !sculptureCanvas.dispatchEvent(new CustomEvent("sculpture-hit-test", {
    cancelable: true, detail: { x, y }
  }));
}

function setOrbitHover(id) {
  if (id === hoverId) return;
  previewNodes.get(hoverId)?.removeAttribute("data-orbit-hover");
  hoverId = id;
  const node = previewNodes.get(hoverId);
  node?.toggleAttribute("data-orbit-hover", node.getAttribute("aria-current") !== "true");
  resetPreviewTilt();
}

function refreshOrbitHover() {
  const target = orbitPointer && !orbitScene.inert && orbitInView
    && document.elementFromPoint(orbitPointer.x, orbitPointer.y);
  const slide = target && target.closest(".preview-card-shell")?.closest(".preview-slide");
  const hidden = slide && isObscured(slide, orbitPointer.x, orbitPointer.y);
  setOrbitHover(slide && !hidden ? slide.dataset.previewId : null);
}

function animateIdleOrbit(time) {
  idleFrame = 0;
  if (!orbitInView || orbitScene.hidden || orbitPhase < 1 || document.hidden || reduceMotion.matches || previewDeck.length < 2) {
    idleTime = 0;
    idleRamp = 0;
    return;
  }
  const paused = hoverId || previewDrag || orbitFrame || time < idleAfter
    || orbitScene.querySelector(":focus-visible") || $(".preview-controls:hover") || $("dialog[open]");
  if (!paused && idleTime) {
    const elapsed = time - idleTime;
    const rampTime = 650;
    const warming = Math.min(elapsed, rampTime - idleRamp);
    const rotationalTime = elapsed - warming + warming * (idleRamp + warming / 2) / rampTime;
    idleRamp += warming;
    orbitPosition -= rotationalTime * Math.min(orbitLayout.slots, previewDeck.length) / turnDuration;
    const current = previewDeck[ringIndex(Math.round(orbitPosition), previewDeck.length)].id;
    if (previewId !== current) {
      previewId = current;
      updatePreviewControls();
    }
    paintOrbit();
    refreshOrbitHover();
  }
  idleTime = paused ? 0 : time;
  if (paused || hoverId) idleRamp = 0;
  idleFrame = requestAnimationFrame(animateIdleOrbit);
}

function wakeIdleOrbit() {
  if (!idleFrame) idleFrame = requestAnimationFrame(animateIdleOrbit);
}

function updatePreviewControls() {
  const index = previewQueue.findIndex(site => site.id === previewId);
  $("#preview-prev").disabled = previewQueue.length < 2;
  $("#preview-next").disabled = previewQueue.length < 2;
  const position = $("#preview-position");
  if (index < 0) {
    position.textContent = "";
    position.removeAttribute("aria-label");
    return;
  }
  position.textContent = String(index + 1).padStart(2, "0") + " / " + String(previewQueue.length).padStart(2, "0");
  position.setAttribute("aria-label", previewQueue[index].name + "，第 " + (index + 1) + " 張，共 " + previewQueue.length + " 張");
}

function releaseQueuedPreviews() {
  if (previewQueue.length === previewDeck.length) return;
  const current = previewDeck[ringIndex(Math.round(orbitPosition), previewDeck.length)]?.id;
  previewDeck = previewQueue;
  orbitPosition = Math.max(0, previewDeck.findIndex(site => site.id === current));
}

function settleOrbit(target) {
  idleAfter = performance.now() + 1250;
  cancelAnimationFrame(orbitFrame);
  orbitFrame = 0;
  previewId = previewDeck[ringIndex(target, previewDeck.length)].id;
  updatePreviewControls();
  const start = orbitPosition;
  if (reduceMotion.matches || Math.abs(target - start) < .001) {
    orbitPosition = target;
    paintOrbit();
    return;
  }
  const began = performance.now();
  const duration = Math.min(720, 410 + 58 * Math.abs(target - start));
  function tick(time) {
    const progress = Math.max(0, Math.min(1, (time - began) / duration));
    orbitPosition = start + (target - start) * (1 - (1 - progress) ** 3);
    paintOrbit();
    orbitFrame = progress < 1 ? requestAnimationFrame(tick) : 0;
  }
  orbitFrame = requestAnimationFrame(tick);
}

function selectPreview(id) {
  releaseQueuedPreviews();
  const index = previewDeck.findIndex(site => site.id === id);
  if (index < 0) return;
  const length = previewDeck.length;
  const offset = index - orbitPosition;
  const nearestTarget = index - Math.round(offset / length) * length;
  settleOrbit(nearestTarget);
}

function stepPreview(direction) {
  if (!previewQueue.length) return;
  const index = previewQueue.findIndex(site => site.id === previewId);
  const next = previewQueue[ringIndex(index + direction, previewQueue.length)];
  if (next) selectPreview(next.id);
}

function renderPreview() {
  const byId = new Map(state.sites.map(site => [site.id, site]));
  const initialIds = new Set(seed.map(site => site.id));
  previewQueue = [
    ...seed.map(site => byId.get(site.id)).filter(Boolean),
    ...state.sites.filter(site => !initialIds.has(site.id)).reverse()
  ];
  orbitScene.hidden = !previewQueue.length;
  $("#sculpture-scene").parentElement.classList.toggle("no-orbit", orbitScene.hidden);
  $(".hero-primary").href = orbitScene.hidden ? "#resources" : "#preview-section";
  const survivors = previewDeck.map(site => byId.get(site.id)).filter(Boolean);
  const filtered = previewDeck.length !== survivors.length;
  let nextDeck = filtered ? previewQueue : survivors;
  if (!nextDeck.length) {
    const firstDeck = previewQueue.filter(site => !aestheticIds.has(site.id));
    nextDeck = firstDeck.length ? firstDeck : previewQueue;
  }
  const favoritesKey = JSON.stringify(state.favorites);
  const needsRefresh = filtered || nextDeck.length !== previewDeck.length
    || nextDeck.some((site, index) => site !== previewDeck[index])
    || previewFavorites !== favoritesKey;

  if (needsRefresh) {
    resetPreviewTilt();
    cancelAnimationFrame(orbitFrame);
    orbitFrame = 0;
    previewDeck = nextDeck;
    orbitPosition = Math.max(0, previewDeck.findIndex(site => site.id === previewId));
    previewId = previewDeck[orbitPosition]?.id ?? "";
    previewFavorites = favoritesKey;
    previewNodes.clear();
    previewTrack.replaceChildren();
  }

  updatePreviewControls();
  measureOrbit();
  refreshOrbitHover();
  wakeIdleOrbit();
}

function resourceCard(site) {
  const label = "管理 " + site.name;
  const id = escapeText(site.id);
  return '<article class="resource-card">' + avatar(site) +
    '<a class="resource-main" ' + openLink(site) + '><h3>' + escapeText(site.name) + icon("external") +
    '</h3><span class="resource-domain">' + escapeText(domain(site.url)) + '</span></a>' +
    '<div class="resource-actions">' + saveButton(site) + '<button type="button" class="icon-btn quiet small" data-manage="' +
    id + '" aria-label="' + escapeText(label) + '" title="' + escapeText(label) + '">' + icon("more") + '</button></div>' +
    '<div class="resource-meta">' + (site.description ? '<p class="resource-description">' + escapeText(site.description) + '</p>' : "") +
    '<span class="eyebrow">' + categories[site.category] + '</span></div></article>';
}

function orderedSites() {
  if (state.sort === "manual") return state.sites;
  return [...state.sites].sort((left, right) => left.name.localeCompare(right.name, "zh-Hant", { sensitivity: "base" }));
}

function applyTheme() {
  const theme = state.theme === "system" ? (darkMode.matches ? "dark" : "light") : state.theme;
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = theme === "dark" ? "#141416" : "#ffffff";
}

function navButtonBounds(button) {
  return {
    left: button.offsetLeft,
    right: button.offsetLeft + button.offsetWidth,
    center: button.offsetTop + button.offsetHeight / 2,
    height: button.offsetHeight
  };
}

function liquidCapsule(bounds, pinch = 0) {
  const { left, right, center, height } = bounds;
  const radius = height / 2;
  const top = center - radius;
  const bottom = center + radius;
  const leftCap = left + radius;
  const rightCap = right - radius;
  const waist = (leftCap + rightCap) / 2;
  const curve = (rightCap - leftCap) / 4;

  return `path("M ${leftCap} ${top}
    C ${leftCap + curve} ${top} ${waist - curve} ${top + pinch} ${waist} ${top + pinch}
    C ${waist + curve} ${top + pinch} ${rightCap - curve} ${top} ${rightCap} ${top}
    A ${radius} ${radius} 0 0 1 ${rightCap} ${bottom}
    C ${rightCap - curve} ${bottom} ${waist + curve} ${bottom - pinch} ${waist} ${bottom - pinch}
    C ${waist - curve} ${bottom - pinch} ${leftCap + curve} ${bottom} ${leftCap} ${bottom}
    A ${radius} ${radius} 0 0 1 ${leftCap} ${top} Z")`.replace(/\s+/g, " ");
}

function positionNavIndicator(button, animate = false) {
  if (!button) return;
  const destination = navButtonBounds(button);
  const capsule = liquidCapsule(destination);
  if (!CSS.supports("clip-path", capsule)) return;

  const previous = activeNavButton;
  const interrupted = navAnimation?.playState === "running";
  const shouldAnimate = animate && previous && !reduceMotion.matches;
  const currentShape = shouldAnimate ? getComputedStyle(navIndicator).clipPath : null;
  navAnimation?.cancel();
  navIndicator.style.clipPath = capsule;
  navigation.classList.add("has-indicator");
  activeNavButton = button;
  if (!shouldAnimate) return;

  const frames = [{ clipPath: currentShape, easing: "cubic-bezier(.28,.71,.4,1)" }];
  if (!interrupted) {
    const origin = navButtonBounds(previous);
    const bridge = {
      left: Math.min(origin.left, destination.left),
      right: Math.max(origin.right, destination.right),
      center: (origin.center + destination.center) / 2,
      height: Math.min(origin.height, destination.height)
    };
    frames.push({ clipPath: liquidCapsule(bridge, bridge.height * .23), offset: .46, easing: "cubic-bezier(.35,.06,.2,1)" });
  }
  frames.push({ clipPath: capsule });
  navAnimation = navIndicator.animate(frames, { duration: 600 });
}

function renderNavigation() {
  const selected = navButtons.find(button => button.dataset.page === page);
  if (selected === activeNavButton) return;
  navButtons.forEach(button => button.setAttribute("aria-pressed", String(button === selected)));
  positionNavIndicator(selected, true);
}

function render() {
  applyTheme();
  document.body.dataset.page = page;
  $("#figma-link").href = state.figma || defaultFigma;
  $("#discovery").hidden = page !== "discover";
  renderNavigation();
  $$("[data-view]").filter(node => node.tagName === "BUTTON").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.view === state.view));
  });

  if (page === "discover") renderPreview();
  $("#resources-title").textContent = page === "discover" ? "全部資源" : "我的收藏";
  $("#filters").innerHTML = Object.entries({ all: "全部", ...categories }).map(([key, label]) =>
    '<button type="button" data-category="' + key + '" class="filter" aria-pressed="' + (category === key) + '">' + label + '</button>'
  ).join("");

  const shown = orderedSites().filter(site =>
    (page === "discover" || state.favorites.includes(site.id)) && (category === "all" || site.category === category)
  );
  $("#resource-count").textContent = shown.length + " 個網站";
  const grid = $("#resource-grid");
  grid.dataset.view = state.view;
  if (shown.length) {
    grid.innerHTML = shown.map(resourceCard).join("");
  } else if (page === "saved" && category === "all") {
    grid.innerHTML = '<div class="empty"><p>還沒有收藏。點擊網站旁的書籤圖標即可收藏。</p><button class="button outline" type="button" data-discover>去發現資源</button></div>';
  } else {
    grid.innerHTML = '<div class="empty"><p>這個分類暫時沒有網站。</p></div>';
  }
}

function showPage(nextPage) {
  page = nextPage;
  category = "all";
  render();
  window.scrollTo(0, 0);
}

function showForm(site) {
  const form = $("#site-form");
  form.reset();
  $("#site-error").hidden = true;
  editingId = site?.id ?? null;
  $("#site-dialog-title").textContent = site ? "編輯網站" : "添加網站";
  form.elements.namedItem("category").value = site?.category ?? (category === "all" ? "visual" : category);
  for (const key of ["name", "url", "description", "preview"]) {
    form.elements.namedItem(key).value = site?.[key] ?? "";
  }
  $("#site-dialog").showModal();
  form.elements.namedItem("name").focus();
}

function renderSearch() {
  const query = $("#search-input").value.trim().toLowerCase();
  const found = orderedSites().filter(site =>
    [site.name, site.url, site.description, categories[site.category]].join(" ").toLowerCase().includes(query)
  );
  $("#search-results").innerHTML = found.length ? found.map(site =>
    '<a class="search-result" ' + openLink(site) + '>' + avatar(site) + '<span>' + escapeText(site.name) +
    '<span class="resource-domain">' + escapeText(domain(site.url)) + '</span></span>' + icon("external") + '</a>'
  ).join("") : '<p class="empty">沒有匹配的網站。</p>';
}

function showSearch() {
  const dialog = $("#search-dialog");
  if (!dialog.open) {
    const other = $("dialog[open]");
    if (other) return;
    $("#search-input").value = "";
    renderSearch();
    dialog.showModal();
  }
  $("#search-input").focus();
}

function setError(selector, message) {
  const node = $(selector);
  node.textContent = message;
  node.hidden = !message;
}

function openSettings() {
  const form = $("#settings-form");
  form.elements.namedItem("theme").value = state.theme;
  form.elements.namedItem("sort").value = state.sort;
  form.elements.namedItem("figma").value = state.figma;
  setError("#settings-error", "");
  $("#settings-dialog").showModal();
}

function setFavorite(button) {
  const id = button.dataset.save;
  const selected = state.favorites.includes(id);
  const favorites = selected ? state.favorites.filter(item => item !== id) : [...state.favorites, id];
  const section = button.closest("section");
  update({ favorites }, selected ? "已取消收藏" : "已收藏");
  (section.querySelector('[data-save="' + CSS.escape(id) + '"]') || $('[data-page="' + page + '"]')).focus({ preventScroll: true });
}

document.addEventListener("click", event => {
  const close = event.target.closest("[data-close]");
  if (close) close.closest("dialog").close();
  const nav = event.target.closest("button[data-page]");
  if (nav) showPage(nav.dataset.page);
  if (event.target.closest(".wordmark, [data-discover]")) {
    event.preventDefault();
    showPage("discover");
  }
  const filter = event.target.closest("[data-category]");
  if (filter) {
    category = filter.dataset.category;
    render();
    $('[data-category="' + category + '"]').focus({ preventScroll: true });
  }
  const view = event.target.closest("button[data-view]");
  if (view) update({ view: view.dataset.view });
  if (event.target.closest("[data-add]")) showForm();
  const saved = event.target.closest("[data-save]");
  if (saved) setFavorite(saved);
  const manage = event.target.closest("[data-manage]");
  if (manage) {
    actionId = manage.dataset.manage;
    const site = state.sites.find(item => item.id === actionId);
    $("#actions-title").textContent = site.name;
    $("#actions-dialog").showModal();
  }
});

$$("[data-site-action]").forEach(button => button.addEventListener("click", () => {
  const site = state.sites.find(item => item.id === actionId);
  $("#actions-dialog").close();
  if (!site) return;
  switch (button.dataset.siteAction) {
    case "edit":
      showForm(site);
      break;
    case "pin":
      update({ sites: [site, ...state.sites.filter(item => item.id !== site.id)], sort: "manual" }, "已移到最前");
      break;
    case "remove":
      removingId = site.id;
      $("#remove-copy").textContent = "要從靈感庫移除「" + site.name + "」嗎？";
      $("#remove-dialog").showModal();
      break;
  }
}));

$("#remove-confirm").addEventListener("click", () => {
  $("#remove-dialog").close();
  update({
    sites: state.sites.filter(site => site.id !== removingId),
    favorites: state.favorites.filter(id => id !== removingId)
  }, "已移除網站");
  removingId = null;
});

$("#site-form").addEventListener("submit", event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const name = fields.get("name").trim();
  const url = normalizeUrl(fields.get("url"));
  if (!name || !url) {
    setError("#site-error", "請填寫網站名稱和有效網址，例如 example.com。");
    return;
  }
  const previewInput = fields.get("preview").trim();
  const preview = previewInput ? normalizeUrl(previewInput) : "";
  if (previewInput && !preview) {
    setError("#site-error", "請填寫有效的預覽圖片網址。");
    return;
  }
  if (state.sites.some(site => site.url === url && site.id !== editingId)) {
    setError("#site-error", "這個網址已經在靈感庫中。");
    return;
  }
  const original = state.sites.find(site => site.id === editingId);
  const site = {
    id: original?.id ?? (globalThis.crypto?.randomUUID?.() ?? "site-" + Date.now() + "-" + Math.random().toString(36).slice(2)),
    mark: original?.name === name ? original.mark : "",
    name, url,
    category: fields.get("category"),
    preview,
    description: fields.get("description").trim()
  };
  const sites = original ? state.sites.map(item => item.id === original.id ? site : item) : [site, ...state.sites];
  $("#site-dialog").close();
  if (!original) {
    page = "discover";
    category = "all";
  }
  update({ sites }, original ? "已更新網站" : "已添加網站");
});

$("#settings-form").addEventListener("submit", event => {
  event.preventDefault();
  const fields = new FormData(event.currentTarget);
  const input = fields.get("figma").trim();
  const figma = input ? normalizeUrl(input) : "";
  if (input && (!figma || domain(figma) !== "figma.com")) {
    setError("#settings-error", "請輸入有效的 figma.com 鏈接。");
    return;
  }
  $("#settings-dialog").close();
  update({ theme: fields.get("theme"), sort: fields.get("sort"), figma }, "已保存偏好");
});

$("#search-launch").addEventListener("click", showSearch);
$("#settings-launch").addEventListener("click", openSettings);
$("#search-input").addEventListener("input", renderSearch);
$("#search-input").addEventListener("keydown", event => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    $(".search-result")?.focus();
  }
});
$("#search-results").addEventListener("keydown", event => {
  if (!["ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const links = $$(".search-result");
  const index = links.indexOf(document.activeElement);
  const next = links[index + (event.key === "ArrowDown" ? 1 : -1)];
  if (next) next.focus();
  else if (event.key === "ArrowUp") $("#search-input").focus();
});
document.addEventListener("keydown", event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    showSearch();
  }
});
darkMode.addEventListener("change", applyTheme);
window.addEventListener("storage", event => {
  if (event.key === storageKey) {
    state = readState();
    render();
    if ($("#search-dialog").open) renderSearch();
  }
});

$("#preview-prev").addEventListener("click", () => stepPreview(-1));
$("#preview-next").addEventListener("click", () => stepPreview(1));
orbitScene.addEventListener("orbit-scroll", event => {
  orbitPhase = event.detail;
  paintOrbit();
  refreshOrbitHover();
  wakeIdleOrbit();
});
new IntersectionObserver(([entry]) => {
  orbitInView = entry.isIntersecting;
  wakeIdleOrbit();
}, { threshold: .42 }).observe(orbitScene);
document.addEventListener("visibilitychange", () => {
  idleTime = 0;
  idleRamp = 0;
  wakeIdleOrbit();
});
window.addEventListener("pointermove", event => {
  if (event.pointerType !== "mouse") return;
  orbitPointer = { x: event.clientX, y: event.clientY };
  refreshOrbitHover();
}, { passive: true, capture: true });
function clearOrbitHover() {
  orbitPointer = null;
  setOrbitHover(null);
}
window.addEventListener("pointerout", event => {
  if (!event.relatedTarget) clearOrbitHover();
});
previewTrack.addEventListener("pointermove", followPreviewPointer, { passive: true });
previewTrack.addEventListener("pointerout", event => {
  if (previewTilt && !previewTilt.shell.contains(event.relatedTarget)) resetPreviewTilt();
});
previewTrack.addEventListener("pointercancel", resetPreviewTilt);
window.addEventListener("blur", clearOrbitHover);
reduceMotion.addEventListener("change", resetPreviewTilt);
reduceMotion.addEventListener("change", wakeIdleOrbit);
reduceMotion.addEventListener("change", () => positionNavIndicator(activeNavButton));
new ResizeObserver(() => positionNavIndicator(activeNavButton)).observe(navigation);
new ResizeObserver(measureOrbit).observe(previewTrack);

previewTrack.addEventListener("keydown", event => {
  switch (event.key) {
    case "ArrowLeft": stepPreview(-1); break;
    case "ArrowRight": stepPreview(1); break;
    case "Home": selectPreview(previewQueue[0]?.id); break;
    case "End": selectPreview(previewQueue.at(-1)?.id); break;
    default: return;
  }
  event.preventDefault();
  previewTrack.focus({ preventScroll: true });
});

previewTrack.addEventListener("click", event => {
  const slide = event.target.closest(".preview-slide");
  if (suppressPreviewClick || (event.detail && slide && isObscured(slide, event.clientX, event.clientY))) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const picture = event.target.closest(".preview-picture");
  if (!picture || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (slide.getAttribute("aria-current") !== "true") {
    event.preventDefault();
    selectPreview(slide.dataset.previewId);
  }
}, { capture: true });

previewTrack.addEventListener("dragstart", event => event.preventDefault());
previewTrack.addEventListener("pointerdown", event => {
  const slide = event.target.closest(".preview-slide");
  if (!slide || isObscured(slide, event.clientX, event.clientY) || event.button !== 0
    || event.target.closest("button") || previewDeck.length < 2) return;
  resetPreviewTilt();
  suppressPreviewClick = false;
  previewDrag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: orbitPosition, moved: false };
});
window.addEventListener("pointermove", event => {
  if (previewDrag?.id !== event.pointerId || !event.buttons) return;
  const difference = event.clientX - previewDrag.x;
  if (!previewDrag.moved) {
    if (Math.abs(difference) < 9 || Math.abs(difference) <= Math.abs(event.clientY - previewDrag.y)) return;
    cancelAnimationFrame(orbitFrame);
    orbitFrame = 0;
    releaseQueuedPreviews();
    previewDrag.start = orbitPosition;
    previewDrag.moved = true;
    previewTrack.setPointerCapture(event.pointerId);
    previewTrack.classList.add("is-dragging");
  }
  event.preventDefault();
  const distance = difference / Math.max(65, orbitLayout.radiusX * .32);
  orbitPosition = previewDrag.start - distance;
  paintOrbit();
}, { passive: false });
function stopPreviewDrag(event) {
  if (previewDrag?.id !== event.pointerId) return;
  const moved = previewDrag.moved;
  previewDrag = null;
  if (!moved) return;
  previewTrack.classList.remove("is-dragging");
  suppressPreviewClick = true;
  settleOrbit(Math.round(orbitPosition));
  setTimeout(() => suppressPreviewClick = false, 0);
}
window.addEventListener("pointerup", stopPreviewDrag);
window.addEventListener("pointercancel", stopPreviewDrag);
previewTrack.addEventListener("lostpointercapture", stopPreviewDrag);

$$("[data-icon]").forEach(node => node.innerHTML = icon(node.dataset.icon));
$("#site-category").innerHTML = Object.entries(categories).map(([key, label]) => '<option value="' + key + '">' + label + '</option>').join("");
$("#shortcut").textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K";
$(".add-launch").setAttribute("aria-label", "添加網站");
render();
