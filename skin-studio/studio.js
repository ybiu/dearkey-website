"use strict";
const $ = (id) => document.getElementById(id);
const colorNames = {
  bg: "背景",
  cap: "字母键",
  special: "功能键",
  ink: "文字",
  accent: "描边与装饰",
};
const past = [],
  future = [],
  buttons = new Map(),
  selected = new Set(),
  assetURLs = new Map();
let design = newDesign(themes[0]),
  mode = "edit",
  tab = "look",
  target = "空格",
  activeAsset = null;
let caps = false,
  numbers = false,
  toastTimer,
  db,
  audioPlayer;
const draftKey = "dearkey.skinStudio.v1";
function note(msg) {
  $("notice").textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("notice").textContent = ""), 2800);
}
function persist() {
  try {
    localStorage.setItem(draftKey, JSON.stringify(design));
    $("saved").textContent = db
      ? "✓ 草稿已保存到本机"
      : "设置已保存，图片仅本次可用";
  } catch {
    $("saved").textContent = "本次草稿未保存";
  }
}
function change(next) {
  if (JSON.stringify(next) === JSON.stringify(design)) return;
  past.push(design);
  if (past.length > 60) past.shift();
  future.length = 0;
  design = next;
  persist();
  refresh();
}
function patch(fields) {
  change({ ...design, ...fields });
}
function restore(stack, other) {
  if (!stack.length) return;
  other.push(design);
  design = stack.pop();
  persist();
  refresh();
}
function selectTab(name) {
  tab = name;
  for (const b of document.querySelectorAll("[data-tab]")) {
    const on = b.dataset.tab === name;
    b.setAttribute("aria-pressed", on);
    $(b.dataset.tab).hidden = !on;
  }
  highlight();
}
function highlight() {
  for (const [key, b] of buttons)
    b.classList.toggle(
      "selected",
      mode === "edit" &&
        tab === "art" &&
        (target === "全部" ||
          target === key ||
          (target === "多选" && selected.has(key))),
    );
}
function labels() {
  const result = {};
  if (mode !== "try") return result;
  const numeric = Array.from("1234567890@#$%&*-+=!?()/:;");
  for (const [i, key] of Array.from("QWERTYUIOPASDFGHJKLZXCVBNM").entries())
    result[key] = numbers ? numeric[i] : caps ? key : key.toLowerCase();
  if (numbers) result["123"] = "ABC";
  return result;
}
function paint() {
  const c = $("preview").getContext("2d"),
    text = labels();
  render(c, design, text);
  const floating = $("float-preview");
  floating.hidden = !design.floating;
  if (design.floating) {
    floatingArt(floating.getContext("2d"), design, floating.width);
    Object.assign(floating.style, {
      width: design.floatSize + "%",
      left: design.floatX + "%",
      top: design.floatY + "%",
    });
  }
  for (const [k, b] of buttons)
    b.setAttribute(
      "aria-label",
      (mode === "edit" ? "装饰 " : "输入 ") + (text[k] || k),
    );
}
function refresh() {
  $("design-title").textContent = design.name || "未命名皮肤";
  if ($("name").value !== design.name) $("name").value = design.name;
  for (const id of ["radius", "font", "effect", "sound"])
    $(id).value = design[id];
  if (
    design.floating.startsWith("img-") &&
    ![...$("floating").options].some((o) => o.value === design.floating)
  )
    $("floating").add(new Option("自选图片", design.floating));
  for (const id of ["floating", "floatX", "floatY", "floatSize"])
    $(id).value = design[id];
  $("float-settings").hidden = !design.floating;
  $("radius-value").textContent = design.radius;
  for (const id of Object.keys(colorNames)) {
    $(id).value = design[id];
    $(id + "-value").textContent = design[id].toUpperCase();
  }
  $("palette").replaceChildren(
    ...Object.keys(colorNames).map((k) => {
      const i = document.createElement("i");
      i.style.backgroundColor = design[k];
      i.title = colorNames[k] + " " + design[k];
      return i;
    }),
  );
  for (const b of $("templates").children)
    b.setAttribute("aria-pressed", b.dataset.theme === design.theme);
  $("undo").disabled = !past.length;
  $("redo").disabled = !future.length;
  paint();
  highlight();
}
function setMode(m) {
  mode = m;
  $("edit").setAttribute("aria-pressed", m === "edit");
  $("try").setAttribute("aria-pressed", m === "try");
  $("trybar").hidden = m !== "try";
  $("stage-caption").textContent =
    m === "try" ? "点按键帽，体验动效和声音" : "点击键帽，为它添加贴纸";
  paint();
  highlight();
}
function decorate(value, field = "art") {
  const ids =
    target === "全部"
      ? keys.map((k) => k.id)
      : target === "多选"
        ? [...selected]
        : [target];
  if (!ids.length) {
    note("请先在预览中选择键帽");
    return;
  }
  const items = { ...design[field] };
  for (const k of ids) {
    if (value) items[k] = value;
    else delete items[k];
  }
  patch({ [field]: items });
}
const sounds = new Map();
function feedback(key) {
  const b = buttons.get(key);
  if (!b) return;
  if (design.sound !== "none") {
    if (!sounds.has(design.sound))
      sounds.set(
        design.sound,
        URL.createObjectURL(
          new Blob([soundWave(design.sound)], { type: "audio/wav" }),
        ),
      );
    if (!audioPlayer) audioPlayer = new Audio();
    const src = sounds.get(design.sound);
    if (audioPlayer.src !== src) audioPlayer.src = src;
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {});
  }
  b.classList.add("pressed");
  setTimeout(() => b.classList.remove("pressed"), 130);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (design.effect === "star") {
    const star = document.createElement("span");
    star.className = "spark";
    star.textContent = "✦";
    star.style.left = b.offsetLeft + b.offsetWidth / 2 + "px";
    star.style.top = b.offsetTop + "px";
    $("keys").append(star);
    setTimeout(() => star.remove(), 500);
  } else if (design.effect === "bounce") {
    b.classList.remove("bounce");
    void b.offsetWidth;
    b.classList.add("bounce");
  }
}
function press(k) {
  if (mode === "edit") {
    if (tab === "art" && target === "多选") {
      if (selected.has(k)) selected.delete(k);
      else selected.add(k);
      highlight();
      return;
    }
    target = k;
    $("target").value = k;
    selectTab("art");
    return;
  }
  feedback(k);
  if (k === "⇧") {
    caps = !caps;
    paint();
    return;
  }
  if (k === "123") {
    numbers = !numbers;
    paint();
    return;
  }
  const input = $("typed"),
    start = input.selectionStart ?? input.value.length,
    end = input.selectionEnd ?? start;
  if (k === "⌫") {
    const prior = Array.from(input.value.slice(0, start)).pop() || "";
    input.setRangeText(
      "",
      start === end ? start - prior.length : start,
      end,
      "end",
    );
  } else {
    const val = { 空格: " ", 换行: "\n" }[k] ?? labels()[k] ?? k;
    input.setRangeText(val, start, end, "end");
  }
}
function download(blob, ext) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download =
    (design.name.trim().replace(/[\\/:*?"<>|]/g, "_") || "梦键皮肤") + ext;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function loadImage(src) {
  const im = new Image();
  im.src = src;
  await im.decode();
  return im;
}
async function addAsset(record) {
  const src = URL.createObjectURL(record.blob);
  try {
    imageCache.set(record.id, await loadImage(src));
  } catch (e) {
    URL.revokeObjectURL(src);
    throw e;
  }
  assetURLs.set(record.id, src);
  const b = document.createElement("button"),
    img = new Image();
  img.src = src;
  img.alt = record.name;
  b.title = record.name;
  b.append(img);
  $("assets").append(b);
  b.onclick = () => {
    activeAsset = record.id;
    $("asset-preview").src = src;
    $("use-art").textContent =
      "贴到" + (target === "全部" ? "全部键帽" : "「" + target + "」键");
    $("asset-dialog").showModal();
  };
  $("asset-count").textContent = assetURLs.size;
  $("batch").hidden = assetURLs.size < 2;
}
function openLibrary() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(draftKey, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("assets", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function prepareAsset(file) {
  if (file.size > 30 * 1024 * 1024) throw Error("请选择小于 30 MB 的图片");
  const src = URL.createObjectURL(file);
  try {
    const im = await loadImage(src),
      ratio = Math.min(1, 1440 / Math.max(im.width, im.height)),
      c = canvasOf(
        Math.max(1, Math.round(im.width * ratio)),
        Math.max(1, Math.round(im.height * ratio)),
      );
    c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
    return {
      id: "img-" + crypto.randomUUID(),
      name: file.name,
      blob: await pngBlob(c),
    };
  } finally {
    URL.revokeObjectURL(src);
  }
}
async function importFiles(input, asBg) {
  const files = [...input.files];
  input.value = "";
  let added = 0,
    failed = 0;
  for (const f of files) {
    try {
      const r = await prepareAsset(f);
      r.order = Date.now();
      if (db)
        await new Promise((resolve, reject) => {
          const tx = db.transaction("assets", "readwrite");
          tx.objectStore("assets").put(r);
          tx.oncomplete = resolve;
          tx.onerror = tx.onabort = () => reject(tx.error);
        });
      await addAsset(r);
      added++;
      if (asBg) patch({ background: r.id });
    } catch {
      failed++;
    }
  }
  note(
    (added ? "已添加 " + added + " 张图片" : "未添加图片") +
      (failed ? "，" + failed + " 张读取失败" : "") +
      (!db ? "（仅本次会话）" : ""),
  );
}
function setup() {
  for (const t of themes) {
    const b = document.createElement("button"),
      canvas = canvasOf(160, 112),
      c = canvas.getContext("2d");
    c.scale(0.66, 0.66);
    c.translate(-710, -12);
    scenery(c, newDesign(t));
    const label = document.createElement("span"),
      en = document.createElement("small");
    label.textContent = t.name;
    en.textContent = t.en;
    label.append(en);
    b.append(canvas, label);
    b.className = "template";
    b.dataset.theme = t.id;
    b.onclick = () => change(newDesign(t));
    $("templates").append(b);
  }
  for (const [id, title] of Object.entries(colorNames)) {
    const row = document.createElement("label");
    row.className = "colorrow";
    const input = document.createElement("input");
    input.type = "color";
    input.id = id;
    input.oninput = () => patch({ [id]: input.value });
    const code = document.createElement("code");
    code.id = id + "-value";
    row.append(input, title, code);
    $("colors").append(row);
  }
  for (const k of keys) {
    const b = document.createElement("button");
    Object.assign(b.style, {
      left: (k.x / WIDTH) * 100 + "%",
      top: (k.y / HEIGHT) * 100 + "%",
      width: (k.w / WIDTH) * 100 + "%",
      height: (k.h / HEIGHT) * 100 + "%",
    });
    b.onclick = () => press(k.id);
    buttons.set(k.id, b);
    $("keys").append(b);
  }
  for (const id of ["全部", "多选", ...keys.map((k) => k.id)])
    $("target").add(
      new Option(
        id === "全部"
          ? "全部键帽"
          : id === "多选"
            ? "多选键帽（在预览中点选）"
            : id,
        id,
      ),
    );
  $("target").value = target;
  for (const glyph of ["✦", "♡", "☾", "✿", "◇", "✧"]) {
    const b = document.createElement("button");
    b.textContent = glyph;
    b.setAttribute("aria-label", "添加贴纸 " + glyph);
    b.onclick = () => decorate(glyph);
    $("motifs").append(b);
  }
  $("target").onchange = (e) => {
    target = e.target.value;
    highlight();
  };
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => (b.onclick = () => selectTab(b.dataset.tab)));
  $("use-face").onclick = () => {
    decorate(activeAsset, "faces");
    selectTab("art");
    $("asset-dialog").close();
  };
  $("remove-face").onclick = () => decorate(null, "faces");
  $("batch").onclick = () => {
    const assets = [...assetURLs.keys()],
      faces = { ...design.faces };
    Array.from("QWERTYUIOPASDFGHJKLZXCVBNM").forEach(
      (k, i) => (faces[k] = assets[i % assets.length]),
    );
    patch({ faces });
    note("已按素材顺序铺满 26 个字母键");
  };
  $("remove-art").onclick = () => decorate(null);
  $("reset-bg").onclick = () => patch({ background: null });
  $("floating").onchange = (e) => patch({ floating: e.target.value });
  for (const id of ["floatX", "floatY", "floatSize"])
    $(id).oninput = (e) => patch({ [id]: Number(e.target.value) });
  $("use-float").onclick = () => {
    patch({ floating: activeAsset });
    selectTab("art");
    $("asset-dialog").close();
  };
  $("choose-bg").onclick = () => $("bg-file").click();
  $("bg-file").onchange = (e) => importFiles(e.target, true);
  $("files").onchange = (e) => importFiles(e.target, false);
  $("use-bg").onclick = () => {
    patch({ background: activeAsset });
    $("asset-dialog").close();
  };
  $("use-art").onclick = () => {
    decorate(activeAsset);
    selectTab("art");
    $("asset-dialog").close();
  };
  $("name").oninput = (e) => patch({ name: e.target.value });
  $("radius").oninput = (e) => patch({ radius: Number(e.target.value) });
  for (const id of ["font", "effect", "sound"])
    $(id).onchange = (e) => patch({ [id]: e.target.value });
  $("undo").onclick = () => restore(past, future);
  $("redo").onclick = () => restore(future, past);
  $("edit").onclick = () => setMode("edit");
  $("try").onclick = () => setMode("try");
  $("audition").onclick = () => feedback(target === "全部" ? "A" : target);
  $("clear").onclick = () => {
    $("typed").value = "";
    $("typed").focus();
  };
  $("typed").onkeydown = (e) => {
    if (!e.isComposing && !e.metaKey && !e.ctrlKey)
      feedback(
        { " ": "空格", Backspace: "⌫", Enter: "换行" }[e.key] ||
          e.key.toUpperCase(),
      );
  };
  $("png").onclick = async () => {
    try {
      const c = canvasOf(WIDTH, HEIGHT);
      const ctx = c.getContext("2d");
      render(ctx, design);
      if (design.floating) {
        const f = $("float-preview"),
          size = (WIDTH * design.floatSize) / 100;
        ctx.drawImage(
          f,
          (WIDTH * design.floatX) / 100 - size / 2,
          (HEIGHT * design.floatY) / 100 - size / 2,
          size,
          size,
        );
      }
      download(await pngBlob(c), ".png");
    } catch {
      note("效果图生成失败，请重试");
    }
  };
  $("export").onclick = () => $("export-dialog").showModal();
  $("download").onclick = async () => {
    const b = $("download");
    b.disabled = true;
    try {
      download(
        await makeSkinPackage({
          ...design,
          name: design.name.trim() || "未命名皮肤",
        }),
        ".bda",
      );
      $("export-dialog").close();
      note("皮肤包已生成");
    } catch {
      note("生成失败，请重试");
    } finally {
      b.disabled = false;
    }
  };
}
async function start() {
  try {
    const raw = JSON.parse(localStorage.getItem(draftKey));
    if (raw && themes.some((t) => t.id === raw.theme))
      design = { ...newDesign(themeFor(raw.theme)), ...raw };
  } catch {}
  document.querySelector("main").inert = true;
  $("export").disabled = true;
  setup();
  refresh();
  setMode("edit");
  try {
    db = await openLibrary();
    const records = await new Promise((resolve, reject) => {
      const q = db.transaction("assets").objectStore("assets").getAll();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    records.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const record of records) await addAsset(record);
    paint();
  } catch {
    note("素材库不可用，图片仅在本次编辑中保留");
  }
  document.querySelector("main").inert = false;
  $("export").disabled = false;
  $("saved").textContent = db ? "草稿保存在本机" : "图片仅本次可用";
}
start();
