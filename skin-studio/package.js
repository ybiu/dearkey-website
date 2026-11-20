// A .bda is a ZIP. PNG and WAV entries can be stored directly without a compression dependency.
function zipStored(entries) {
  const local = [],
    central = [],
    enc = new TextEncoder();
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (n & 1 ? 0xedb88320 : 0);
    return n;
  });
  function record(size) {
    const bytes = new Uint8Array(size),
      view = new DataView(bytes.buffer);
    return {
      bytes,
      u16: (i, v) => view.setUint16(i, v, true),
      u32: (i, v) => view.setUint32(i, v, true),
    };
  }
  let offset = 0,
    centralSize = 0;
  for (const [name, bytes] of entries) {
    const path = enc.encode(name);
    let crc = 0xffffffff;
    for (const b of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ b) & 255];
    crc = (crc ^ 0xffffffff) >>> 0;
    const l = record(30);
    l.u32(0, 0x04034b50);
    l.u16(4, 20);
    l.u16(6, 0x800);
    l.u16(12, 33);
    l.u32(14, crc);
    l.u32(18, bytes.length);
    l.u32(22, bytes.length);
    l.u16(26, path.length);
    local.push(l.bytes, path, bytes);
    const c = record(46);
    c.u32(0, 0x02014b50);
    c.u16(4, 20);
    c.u16(6, 20);
    c.u16(8, 0x800);
    c.u16(14, 33);
    c.u32(16, crc);
    c.u32(20, bytes.length);
    c.u32(24, bytes.length);
    c.u16(28, path.length);
    c.u32(42, offset);
    central.push(c.bytes, path);
    centralSize += 46 + path.length;
    offset += 30 + path.length + bytes.length;
  }
  const end = record(22);
  end.u32(0, 0x06054b50);
  end.u16(8, entries.length);
  end.u16(10, entries.length);
  end.u32(12, centralSize);
  end.u32(16, offset);
  return new Blob([...local, ...central, end.bytes], {
    type: "application/octet-stream",
  });
}
const pngBlob = (c) =>
  new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(Error("无法生成图片"))),
      "image/png",
    ),
  );
function soundWave(kind) {
  const rate = 22050,
    n = Math.floor(rate * (kind === "pop" ? 0.105 : 0.046)),
    data = new Uint8Array(44 + n * 2),
    v = new DataView(data.buffer);
  const chars = (i, s) => {
    for (let k = 0; k < s.length; k++) data[i + k] = s.charCodeAt(k);
  };
  chars(0, "RIFF");
  v.setUint32(4, data.length - 8, true);
  chars(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  chars(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const t = i / rate,
      phase = kind === "pop" ? 680 * t - 1900 * t * t : 1250 * t;
    v.setInt16(
      44 + i * 2,
      Math.sin(2 * Math.PI * phase) *
        Math.exp((-6 * i) / n) *
        Math.min(1, i / 14) *
        9000,
      true,
    );
  }
  return data;
}
async function makeSkinPackage(d) {
  const enc = new TextEncoder(),
    entries = [],
    styles = {},
    definitions = {},
    resources = new Map();
  const addText = (path, s) => entries.push([path, enc.encode(s)]);
  async function addPNG(id, name, canvas) {
    styles[id] = { normalImage: { resource: { resourceID: name } } };
    entries.push([
      "studio/res/" + name + ".png",
      new Uint8Array(await (await pngBlob(canvas)).arrayBuffer()),
    ]);
    return { key: id };
  }
  const bg = canvasOf(WIDTH, HEIGHT);
  scenery(bg.getContext("2d"), d);
  const backdrop = await addPNG(1, "background", bg);
  let serial = 10;
  for (const k of keys) {
    const letter = /^[A-Z]$/.test(k.id),
      n = Math.round(k.w),
      signature = JSON.stringify([
        letter,
        n,
        d.art[k.id] || "",
        d.faces?.[k.id] || "",
      ]);
    if (!resources.has(signature)) {
      const canvas = canvasOf(n, k.h);
      keyCap(canvas.getContext("2d"), d, k.id, n, k.h);
      const id = serial++;
      resources.set(signature, await addPNG(id, "cap_" + id, canvas));
    }
    definitions[k.id] = { backStyle: resources.get(signature) };
  }
  const letters = Object.fromEntries(
    Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (k) => [
      "KEY_" + k,
      definitions[k],
    ]),
  );
  const panel = {
    wholeBackStyle: backdrop,
    cand: { firstCellForeStyle: { key: 3 } },
    keys: {
      ...letters,
      KEY_F38: definitions["空格"],
      KEY_F39: definitions["换行"],
    },
  };
  const config = {
    designWidth: 960,
    imageStyles: styles,
    textStyles: { 3: { normalColor: parseInt("FF" + d.ink.slice(1), 16) } },
    panels: { py_26: panel, py_9: { keys: { KEY_F1: definitions["123"] } } },
  };
  addText("Info.txt", "Name=" + d.name.trim() + "\nAtomSkinName=studio\n");
  addText("studio/port/appearanceConfig.json", JSON.stringify(config));
  const caps = Object.fromEntries(
    Object.entries(definitions).map(([key, def]) => [
      key,
      styles[def.backStyle.key].normalImage.resource.resourceID,
    ]),
  );
  if (d.floating) {
    const c = canvasOf(192, 192);
    floatingArt(c.getContext("2d"), d, 192);
    entries.push([
      "studio/overlay.png",
      new Uint8Array(await (await pngBlob(c)).arrayBuffer()),
    ]);
  }
  addText(
    "dearkey-studio.json",
    JSON.stringify({
      version: 1,
      overlay: d.floating
        ? { x: d.floatX / 100, y: d.floatY / 100, size: d.floatSize / 100 }
        : null,
      font: d.font,
      effect: d.effect,
      sound: d.sound,
      bg: d.bg,
      cap: d.cap,
      special: d.special,
      ink: d.ink,
      accent: d.accent,
      caps,
    }),
  );
  if (d.sound !== "none") entries.push(["studio/key.wav", soundWave(d.sound)]);
  return zipStored(entries);
}
