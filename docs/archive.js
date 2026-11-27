"use strict";

(() => {
  const $ = id => document.getElementById(id);
  const mediaLabels = { image: "照片", video: "视频", website: "网站" };
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("form-index-archive") : null;
  // Old email links now lead to the ordinary registration form.
  const oldInvite = location.hash.startsWith("#verify=");
  let mode = oldInvite || location.hash === "#register" ? "register" : "login";
  if (oldInvite) history.replaceState(null, "", location.pathname + "#register");
  let account;
  let selectedOwner;
  let entries = [];
  let requestVersion = 0;
  let accountVersion = 0;
  let paused = motion.matches;
  let frame = 0;
  let previousTime = 0;
  let offset = 0;
  let resumeAt = 0;
  let underPointer = false;
  let groupWidth = 0;
  let viewing = null;
  const previewObserver = new IntersectionObserver(records => {
    for (const record of records) {
      if (!record.isIntersecting || !record.target.isConnected) continue;
      record.target.src = record.target.dataset.src;
      previewObserver.unobserve(record.target);
    }
  }, { root: $("reel"), rootMargin: "0px 180px" });
  try {
    const pref = JSON.parse(localStorage.getItem("form-index.settings.v1"))?.theme;
    document.documentElement.dataset.theme = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme:dark)").matches) ? "dark" : "light";
  } catch { /* Storage is optional for the public theme preference. */ }

  async function api(path, options = {}) {
    const response = await fetch("./api/" + path, { credentials: "same-origin", cache: "no-store", ...options });
    if (!(response.headers.get("content-type") || "").includes("application/json")) {
      throw new Error("当前页面未连接存档服务。请从完整版网站进入。");
    }
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401 && account && path !== "login") {
        clearPrivate();
        showAuth();
      }
      throw new Error(data.error || "操作失败，请重试。");
    }
    return data;
  }

  function post(path, body) {
    const headers = { "X-Archive-Request": "1" };
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body || {});
    }
    return api(path, { method: "POST", headers, body });
  }

  function showAuth() {
    $("studio").hidden = true;
    $("gate").hidden = false;
    $("auth").hidden = false;
    $("auth-switch").hidden = false;
    const registering = mode === "register";
    $("auth-title").textContent = registering ? "创建账号" : "登录存档";
    $("auth-submit").textContent = registering ? "注册并进入" : "登录";
    $("auth-switch").textContent = registering ? "返回登录" : "注册账号";
    $("username-label").hidden = $("username").disabled = !registering;
    $("password").autocomplete = registering ? "new-password" : "current-password";
    $("password").minLength = registering ? 10 : 1;
    $("password").placeholder = registering ? "至少 10 个字符" : "";
    $("auth-status").textContent = "";
  }

  function stopMotion() {
    cancelAnimationFrame(frame);
    frame = previousTime = 0;
  }

  function clearPrivate() {
    accountVersion++;
    requestVersion++;
    stopMotion();
    previewObserver.disconnect();
    viewing = account = selectedOwner = null;
    entries = [];
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    $("viewer-body").replaceChildren();
    $("viewer-title").textContent = "";
    $("owner-select").replaceChildren();
    $("name-form").reset();
    $("username").value = "";
    $("owner-label").textContent = "";
    $("add-form").reset();
    $("strip").replaceChildren();
    $("studio-status").textContent = "";
    $("studio").hidden = true;
  }

  async function connect() {
    const version = ++accountVersion;
    try {
      const info = await api("session");
      if (version !== accountVersion) return;
      if (!info.user) {
        clearPrivate();
        showAuth();
        return;
      }
      if (account && account.id !== info.user.id) {
        clearPrivate();
        return connect();
      }
      account = info.user;
      selectedOwner ??= account.id;
      $("gate").hidden = true;
      $("studio").hidden = false;
      $("owner-field").hidden = !account.developer;
      if (account.developer) {
        const owners = await api("owners");
        if (version !== accountVersion) return;
        $("owner-select").replaceChildren(...owners.map(owner => new Option(owner.username || owner.email, owner.id)));
        $("owner-select").value = selectedOwner;
      }
      await loadGallery();
    } catch (err) {
      if (version !== accountVersion) return;
      clearPrivate();
      $("gate").hidden = false;
      $("auth").hidden = $("auth-switch").hidden = true;
      $("auth-status").textContent = err.message;
    }
  }

  $("auth-switch").onclick = () => {
    mode = mode === "login" ? "register" : "login";
    $("password").value = "";
    showAuth();
    $("email").focus();
  };
  $("auth").onsubmit = async event => {
    event.preventDefault();
    const submit = $("auth-submit");
    submit.disabled = $("auth-switch").disabled = true;
    $("auth-status").textContent = "正在提交…";
    try {
      const credentials = { email: $("email").value.trim(), password: $("password").value };
      if (mode === "register") credentials.username = $("username").value;
      await post(mode, credentials);
      $("password").value = "";
      mode = "login";
      channel?.postMessage("session");
      await connect();
    } catch (err) {
      $("auth-status").textContent = err.message;
    } finally {
      submit.disabled = $("auth-switch").disabled = false;
    }
  };
  $("logout").onclick = async () => {
    try {
      await post("logout");
      mode = "login";
      clearPrivate();
      showAuth();
      channel?.postMessage("session");
    } catch (err) { $("studio-status").textContent = err.message; }
  };

  function node(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text) el.textContent = text;
    return el;
  }

  function fileMedia(entry, detail) {
    const video = entry.kind === "video";
    const el = node(video ? "video" : "img");
    if (video) {
      el.preload = "metadata";
      el.playsInline = true;
      el.muted = !detail;
      el.controls = detail;
    } else {
      el.loading = detail ? "eager" : "lazy";
      el.alt = detail ? entry.title : "";
    }
    const src = "./api/media/" + entry.id;
    if (video && !detail) {
      el.dataset.src = src + "#t=0.1";
      previewObserver.observe(el);
    } else el.src = src;
    return el;
  }

  function makeFilm(entry) {
    const card = node("button", "film");
    card.type = "button";
    card.dataset.item = entry.id;
    const isWeb = entry.kind === "website";
    const face = node("span", "film-face" + (isWeb ? " web-face" : ""));
    let caption = mediaLabels[entry.kind];
    if (isWeb) {
      const host = new URL(entry.url).hostname.replace(/^www\./, "");
      face.append(node("b", "", host.slice(0, 2)));
      caption += " · " + host;
    } else {
      face.append(fileMedia(entry, false));
    }
    const info = node("span", "film-info");
    info.append(node("strong", "", entry.title), node("small", "", caption));
    card.append(face, info);
    return card;
  }

  function motionTick(time) {
    frame = 0;
    const reel = $("reel");
    if (!groupWidth || paused || document.hidden || !account || $("studio").hidden || entries.length < 2) return;
    if (time > resumeAt && !underPointer && !document.querySelector("dialog[open]") && !reel.matches(":focus-within")) {
      offset += Math.min(time - (previousTime || time), 50) * .031;
      reel.scrollLeft = offset % groupWidth;
    } else {
      offset = reel.scrollLeft;
    }
    previousTime = time;
    frame = requestAnimationFrame(motionTick);
  }

  function runMotion() {
    stopMotion();
    $("pause").textContent = paused ? "播放" : "暂停";
    $("pause").setAttribute("aria-pressed", String(paused));
    document.querySelector(".gallery").classList.toggle("paused", paused || motion.matches);
    if (!paused && groupWidth && entries.length > 1) frame = requestAnimationFrame(motionTick);
  }

  function buildReel() {
    stopMotion();
    previewObserver.disconnect();
    const strip = $("strip");
    strip.replaceChildren();
    groupWidth = 0;
    $("gallery-empty").hidden = !!entries.length;
    $("gallery-empty").querySelector("p").textContent = selectedOwner === account.id ?
      "存入照片、视频或网站，即可在这里轮播。" : "这个账号还没有存入内容。";
    $("transport").hidden = entries.length < 2;
    $("reel").hidden = !entries.length;
    $("gallery-count").textContent = entries.length + " 份存档";
    strip.classList.toggle("single", entries.length === 1);
    if (!entries.length) return;
    const group = node("div", "reel-group");
    group.append(...entries.map(makeFilm));
    strip.append(group);
    if (entries.length > 1) {
      groupWidth = group.offsetWidth;
      // Only the neighboring cards needed to fill the viewport are repeated.
      const tail = node("div", "reel-group");
      tail.setAttribute("aria-hidden", "true");
      const cardWidth = groupWidth / entries.length;
      for (let i = 0; i < Math.ceil($("reel").clientWidth / cardWidth) + 1; i++) {
        const card = makeFilm(entries[i % entries.length]);
        card.tabIndex = -1;
        tail.append(card);
      }
      strip.append(tail);
    }
    offset = $("reel").scrollLeft = 0;
    runMotion();
  }

  async function loadGallery() {
    const version = ++requestVersion;
    const owner = selectedOwner;
    $("open-add").hidden = owner !== account.id;
    $("archive-title").textContent = owner === account.id ? "我的灵感存档" : "账号灵感存档";
    $("owner-label").textContent = owner === account.id ? account.username || account.email :
      $("owner-select").selectedOptions[0].text + " · 只读";
    $("rename").hidden = owner !== account.id;
    $("rename").textContent = account.username ? "修改用户名" : "设置用户名";
    stopMotion();
    entries = [];
    $("strip").replaceChildren();
    $("gallery-empty").hidden = $("transport").hidden = true;
    $("gallery-count").textContent = "正在载入…";
    try {
      const result = await api("items?owner=" + encodeURIComponent(owner));
      if (version !== requestVersion) return;
      entries = result;
      buildReel();
    } catch (err) {
      if (version === requestVersion) $("gallery-count").textContent = err.message;
    }
  }

  function step(direction) {
    if (entries.length < 2 || !groupWidth) return;
    const width = groupWidth / entries.length;
    const index = Math.round($("reel").scrollLeft / width);
    offset = ((index + direction + entries.length) % entries.length) * width;
    $("reel").scrollLeft = offset;
    resumeAt = performance.now() + 1500;
  }
  $("previous").onclick = () => step(-1);
  $("next").onclick = () => step(1);
  $("pause").onclick = () => { paused = !paused; runMotion(); };
  $("reel").onkeydown = event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    }
  };
  $("reel").onpointerenter = event => { underPointer = event.pointerType === "mouse"; };
  $("reel").onpointerleave = () => { underPointer = false; };
  for (const type of ["touchstart", "touchmove", "wheel"]) {
    $("reel").addEventListener(type, () => { resumeAt = performance.now()+1800; }, { passive:true });
  }
  let lastWidth = 0;
  new ResizeObserver(() => {
    const width = $("reel").clientWidth;
    if (width && width !== lastWidth && entries.length) buildReel();
    lastWidth = width;
  }).observe($("reel"));
  $("rename").onclick = () => {
    $("new-username").value = account.username || "";
    $("name-status").textContent = "";
    $("name-dialog").showModal();
    $("new-username").focus();
  };
  $("name-form").onsubmit = async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("[type=submit]");
    button.disabled = true;
    try {
      const result = await post("username", { username: $("new-username").value });
      $("name-dialog").close();
      account.username = result.username;
      $("owner-label").textContent = result.username;
      $("rename").textContent = "修改用户名";
      if (account.developer) $("owner-select").selectedOptions[0].text = result.username;
      channel?.postMessage("profile");
    } catch (err) { $("name-status").textContent = err.message; }
    finally { button.disabled = false; }
  };
  $("owner-select").onchange = () => {
    selectedOwner = Number($("owner-select").value);
    $("studio-status").textContent = "";
    loadGallery();
  };
  $("strip").onclick = event => {
    const entry = entries.find(e => e.id === event.target.closest(".film")?.dataset.item);
    if (!entry) return;
    viewing = entry.id;
    $("remove-actions").hidden = selectedOwner !== account.id;
    $("remove-check").hidden = true;
    $("viewer-status").textContent = "";
    $("viewer-title").textContent = entry.title;
    const body = $("viewer-body");
    body.replaceChildren();
    if (entry.kind === "website") {
      const link = node("a", "button primary", "打开网站");
      link.href = entry.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      body.append(node("p", "", entry.url), link);
    } else {
      body.append(fileMedia(entry, true));
    }
    $("viewer").showModal();
  };
  $("viewer").onclose = () => { viewing = null; $("viewer-body").replaceChildren(); };
  $("remove").onclick = () => {
    $("remove-actions").hidden = true;
    $("remove-check").hidden = false;
    $("keep").focus();
  };
  $("keep").onclick = () => {
    $("remove-actions").hidden = false;
    $("remove-check").hidden = true;
  };
  $("confirm-remove").onclick = async () => {
    const id = viewing;
    $("confirm-remove").disabled = true;
    try {
      await post("items/" + id + "/remove");
      if (viewing !== id) return;
      $("viewer").close();
      await loadGallery();
      $("studio-status").textContent = "已移除存档。";
    } catch (err) { $("viewer-status").textContent = err.message; }
    finally { $("confirm-remove").disabled = false; }
  };
  document.querySelectorAll(".close").forEach(button => button.onclick = () => button.closest("dialog").close());
  function updateKind() {
    const web = $("kind").value === "website";
    $("url").required = web;
    $("file").required = !web;
    $("url-field").hidden = !web;
    $("file-field").hidden = web;
    $("add-status").textContent = "";
  }
  $("kind").onchange = updateKind;
  $("open-add").onclick = () => {
    $("add-form").reset();
    updateKind();
    $("add-dialog").showModal();
  };
  $("add-form").onsubmit = async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const owner = account.id;
    const title = $("item-title").value.trim();
    let body;
    if ($("kind").value === "file") {
      const file = $("file").files[0];
      if (file.size > 100 * 1024**2) { $("add-status").textContent = "文件超过 100 MB。"; return; }
      body = new FormData();
      body.append("file", file);
      body.append("title", title);
    } else {
      body = { title, url: $("url").value.trim() };
    }
    const submit = form.querySelector("[type=submit]");
    submit.disabled = true;
    $("add-status").textContent = "正在保存…";
    try {
      await post("items", body);
      if (account?.id !== owner) return;
      $("add-dialog").close();
      form.reset();
      await loadGallery();
      $("studio-status").textContent = "已存入灵感存档。";
    } catch (err) {
      $("add-status").textContent = err.message;
    } finally { submit.disabled = false; }
  };

  channel?.addEventListener("message", () => { clearPrivate(); connect(); });
  motion.addEventListener("change", () => { paused = motion.matches; runMotion(); });
  window.addEventListener("pagehide", clearPrivate);
  window.addEventListener("pageshow", event => { if (event.persisted) connect(); });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopMotion();
    else if (account) connect();
  });
  connect();
})();
