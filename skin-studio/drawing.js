// All art is drawn at keyboard resolution so the preview and exported textures share a renderer.
const WIDTH = 960,
  HEIGHT = 552;
const themes = [
  {
    id: "luna",
    name: "月兔来信",
    en: "Lunar Mail",
    bg: "#C9B6E4",
    cap: "#F5EDFC",
    special: "#DED1F2",
    ink: "#57446D",
    accent: "#A484CA",
    sky: "#8974AF",
    hill: "#B49AD0",
    glow: "#FFECB2",
    icon: "✦",
  },
  {
    id: "peach",
    name: "莓果花园",
    en: "Berry Garden",
    bg: "#EFCBCF",
    cap: "#FFF5F1",
    special: "#F4DCE2",
    ink: "#744D5C",
    accent: "#C98391",
    sky: "#E5A6B4",
    hill: "#D8ADA8",
    glow: "#FFF1D5",
    icon: "♡",
  },
  {
    id: "mint",
    name: "薄荷海岸",
    en: "Mint Coast",
    bg: "#AECFC7",
    cap: "#F1FCF4",
    special: "#CFE8DC",
    ink: "#365D55",
    accent: "#70A89E",
    sky: "#81B4BA",
    hill: "#8AB8B1",
    glow: "#FFF2BF",
    icon: "◇",
  },
  {
    id: "night",
    name: "深夜电台",
    en: "Night Radio",
    bg: "#444965",
    cap: "#686D8E",
    special: "#555D7F",
    ink: "#F9F2FF",
    accent: "#ADB1D6",
    sky: "#292D4E",
    hill: "#50567B",
    glow: "#FFE6AE",
    icon: "✧",
  },
];
const themeFor = (id) => themes.find((t) => t.id === id) || themes[0];
function newDesign(t) {
  return {
    theme: t.id,
    name: t.name,
    bg: t.bg,
    cap: t.cap,
    special: t.special,
    ink: t.ink,
    accent: t.accent,
    floating: "",
    floatX: 78,
    floatY: 24,
    floatSize: 10,
    radius: 13,
    font: "rounded",
    effect: "star",
    sound: "none",
    background: null,
    faces: {},
    art: { Q: t.icon, P: t.icon, M: t.icon, 空格: t.icon },
  };
}
const fontFamilies = {
  rounded: 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif',
  serif: 'Georgia, "Songti SC", serif',
  mono: "Menlo, monospace",
};
const imageCache = new Map();
function canvasOf(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function ellipse(c, x, y, rx, ry, color, rotation = 0) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  c.fillStyle = color;
  c.fill();
}
function star(c, x, y, r, color) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.14, y - r * 0.14, x + r, y);
  c.quadraticCurveTo(x + r * 0.14, y + r * 0.14, x, y + r);
  c.quadraticCurveTo(x - r * 0.14, y + r * 0.14, x - r, y);
  c.quadraticCurveTo(x - r * 0.14, y - r * 0.14, x, y - r);
  c.fillStyle = color;
  c.fill();
}
function cloud(c, x, y, s, color) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(-47, 10);
  c.bezierCurveTo(-58, 0, -43, -12, -29, -8);
  c.bezierCurveTo(-27, -33, 2, -34, 12, -16);
  c.bezierCurveTo(26, -23, 40, -12, 40, -4);
  c.bezierCurveTo(57, -4, 59, 10, 44, 12);
  c.quadraticCurveTo(0, 17, -47, 10);
  c.fillStyle = color;
  c.fill();
  c.restore();
}
function bunny(c, x, y, s) {
  c.save();
  c.translate(x, y);
  c.scale(s, s);
  const fur = "#FFF4E8",
    edge = "#9F8199";
  function part(x, y, w, h, angle = 0) {
    ellipse(c, x, y, w + 2, h + 2, edge, angle);
    ellipse(c, x, y, w, h, fur, angle);
  }
  part(33, 11, 13, 11);
  part(4, 8, 33, 25);
  part(-17, -27, 8, 24, -0.28);
  part(-1, -30, 7, 24, 0.19);
  ellipse(c, -17, -30, 3, 14, "#EECBCF", -0.28);
  ellipse(c, -1, -33, 2.6, 14, "#EECBCF", 0.19);
  part(-7, -7, 28, 22);
  ellipse(c, -18, -9, 2.3, 3.2, "#694D64");
  ellipse(c, -1, -9, 2.3, 3.2, "#694D64");
  ellipse(c, -25, -3, 5, 2.8, "#F1C2CB");
  ellipse(c, 6, -3, 5, 2.8, "#F1C2CB");
  ellipse(c, -10, -4, 2.2, 1.5, "#A07186");
  part(-17, 26, 12, 6);
  part(17, 26, 13, 6);
  c.restore();
}
function scenery(c, d) {
  const t = themeFor(d.theme),
    sky = c.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, t.sky);
  sky.addColorStop(0.7, d.bg);
  sky.addColorStop(1, d.bg);
  c.fillStyle = sky;
  c.fillRect(0, 0, WIDTH, HEIGHT);
  if (d.background && imageCache.has(d.background)) {
    const im = imageCache.get(d.background),
      scale = Math.max(WIDTH / im.width, HEIGHT / im.height);
    c.drawImage(
      im,
      (WIDTH - im.width * scale) / 2,
      (HEIGHT - im.height * scale) / 2,
      im.width * scale,
      im.height * scale,
    );
    return;
  }
  const moonX = 135,
    moonY = 75;
  c.save();
  c.shadowColor = t.glow;
  c.shadowBlur = 18;
  c.fillStyle = t.glow;
  c.beginPath();
  if (d.theme === "luna" || d.theme === "night") {
    c.moveTo(moonX + 11, moonY - 38);
    c.bezierCurveTo(
      moonX - 46,
      moonY - 40,
      moonX - 48,
      moonY + 39,
      moonX + 3,
      moonY + 38,
    );
    c.bezierCurveTo(
      moonX + 24,
      moonY + 39,
      moonX + 39,
      moonY + 24,
      moonX + 41,
      moonY + 11,
    );
    c.bezierCurveTo(
      moonX + 7,
      moonY + 28,
      moonX - 16,
      moonY - 7,
      moonX + 11,
      moonY - 38,
    );
  } else {
    c.arc(moonX, moonY, 32, 0, Math.PI * 2);
  }
  c.fill();
  c.restore();
  for (let i = 0; i < 53; i++) {
    const x = (i * 379 + 53) % WIDTH,
      y = (i * 197 + 13) % 240;
    star(c, x, y, i % 5 === 0 ? 6 : 2.2, t.glow);
  }
  const pts = [
    [300, 55],
    [355, 33],
    [393, 75],
    [457, 49],
  ];
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = "#F8EBFF80";
  c.lineWidth = 1.5;
  c.stroke();
  pts.forEach(([x, y], i) => star(c, x, y, i % 2 ? 5 : 7, t.glow));
  cloud(c, 240, 112, 0.7, "#FFF8FC99");
  cloud(c, 630, 67, 0.72, "#FFF8FCB0");
  cloud(c, 746, 97, 0.45, "#FFF8FC80");
  cloud(c, 43, 90, 0.45, "#FFF8FC90");
  c.beginPath();
  c.moveTo(0, 133);
  c.bezierCurveTo(120, 87, 219, 190, 330, 143);
  c.bezierCurveTo(450, 92, 552, 179, 678, 133);
  c.bezierCurveTo(790, 85, 860, 148, 960, 111);
  c.lineTo(960, HEIGHT);
  c.lineTo(0, HEIGHT);
  c.fillStyle = t.hill;
  c.fill();
  c.beginPath();
  c.moveTo(0, 162);
  c.bezierCurveTo(210, 112, 330, 190, 575, 150);
  c.bezierCurveTo(752, 125, 857, 145, 960, 148);
  c.lineTo(960, HEIGHT);
  c.lineTo(0, HEIGHT);
  c.fillStyle = d.bg;
  c.fill();
  if (d.theme === "peach") {
    for (const [x, y, s] of [
      [820, 106, 0.76],
      [858, 93, 1],
      [907, 112, 0.64],
    ]) {
      c.save();
      c.translate(x, y);
      c.scale(s, s);
      c.fillStyle = "#CF667B";
      c.beginPath();
      c.moveTo(0, 32);
      c.bezierCurveTo(-48, 1, -26, -32, 0, -17);
      c.bezierCurveTo(34, -38, 41, -1, 0, 32);
      c.fill();
      for (let i = 0; i < 5; i++)
        ellipse(
          c,
          (i - 2) * 6,
          -17 + Math.abs(i - 2) * 2,
          4,
          11,
          "#648B79",
          i * 0.47 - 1,
        );
      for (const [u, v] of [
        [-11, -3],
        [9, -4],
        [-3, 5],
        [10, 10],
        [-2, 20],
      ])
        ellipse(c, u, v, 1.5, 2.4, "#FFE5A8");
      c.restore();
    }
  } else if (d.theme === "mint") {
    c.save();
    c.translate(855, 102);
    c.fillStyle = "#FFF5D5";
    c.beginPath();
    c.moveTo(-4, -47);
    c.lineTo(-42, 6);
    c.lineTo(-4, 6);
    c.fill();
    c.fillStyle = "#F2B49F";
    c.beginPath();
    c.moveTo(2, -36);
    c.lineTo(31, 6);
    c.lineTo(2, 6);
    c.fill();
    c.fillStyle = "#537C7B";
    c.beginPath();
    c.moveTo(-46, 11);
    c.lineTo(41, 11);
    c.lineTo(27, 24);
    c.lineTo(-29, 24);
    c.fill();
    c.restore();
  } else if (d.theme === "night") {
    c.save();
    c.translate(850, 104);
    c.strokeStyle = "#E4DBF1";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(-27, -16);
    c.lineTo(23, -51);
    c.stroke();
    c.fillStyle = "#DFCDDC";
    c.beginPath();
    c.roundRect(-44, -20, 88, 48, 9);
    c.fill();
    ellipse(c, -20, 4, 15, 15, "#686D8E");
    ellipse(c, -20, 4, 8, 8, "#8287A6");
    c.fillStyle = "#686D8E";
    c.fillRect(4, -6, 28, 5);
    c.fillRect(4, 4, 24, 3);
    c.restore();
  } else bunny(c, 858, 101, 1.18);
  star(c, 921, 78, 11, t.glow);
  for (let i = 0; i < 34; i++)
    star(
      c,
      (i * 263 + 50) % WIDTH,
      157 + ((i * 167) % 390),
      i % 4 ? 2 : 5,
      "#FFFFFF55",
    );
}
const rows = [
  Array.from("QWERTYUIOP"),
  Array.from("ASDFGHJKL"),
  ["⇧", ...Array.from("ZXCVBNM"), "⌫"],
  ["123", "，", "空格", "。", "换行"],
];
const keys = rows.flatMap((row, index) => {
  const weights = row.map(
    (k) => ({ "⇧": 1.5, "⌫": 1.5, 123: 1.4, 空格: 4.6, 换行: 2 })[k] || 1,
  );
  const total = weights.reduce((a, b) => a + b),
    width = index === 1 ? 836 : 928,
    unit = (width - (row.length - 1) * 7) / total;
  let x = (WIDTH - width) / 2;
  return row.map((id, i) => {
    const w = weights[i] * unit,
      key = { id, x, y: 166 + index * 93, w, h: 79 };
    x += w + 7;
    return key;
  });
});
function keyCap(c, d, key, w, h) {
  const letter = /^[A-Z]$/.test(key),
    r = Math.min(Number(d.radius) * 1.6, w / 2 - 1, (h - 5) / 2 - 1);
  c.beginPath();
  c.roundRect(0, 3, w, h - 3, r);
  c.fillStyle = d.accent;
  c.fill();
  c.beginPath();
  c.roundRect(0, 0, w, h - 5, r);
  c.fillStyle = letter ? d.cap : d.special;
  c.fill();
  const face = imageCache.get(d.faces?.[key]);
  if (face) {
    c.save();
    c.clip();
    const scale = Math.max(w / face.width, (h - 5) / face.height);
    c.drawImage(
      face,
      (w - face.width * scale) / 2,
      (h - 5 - face.height * scale) / 2,
      face.width * scale,
      face.height * scale,
    );
    c.restore();
  }
  c.strokeStyle = "#FFFFFF77";
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(1, 1, w - 2, h - 7, r);
  c.stroke();
  const motif = d.art[key];
  if (motif) {
    const size = Math.min(w * 0.3, h * 0.34),
      x = w - size * 0.65 - 3,
      y = size * 0.6 + 3;
    if (imageCache.has(motif)) {
      const im = imageCache.get(motif),
        s = size / Math.max(im.width, im.height);
      c.drawImage(
        im,
        x - (im.width * s) / 2,
        y - (im.height * s) / 2,
        im.width * s,
        im.height * s,
      );
    } else if (!motif.startsWith("img-")) {
      c.fillStyle = d.accent;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.font = size + "px system-ui";
      c.fillText(motif, x, y);
    }
  }
}
function render(c, d, labels = null) {
  scenery(c, d);
  for (const k of keys) {
    c.save();
    c.translate(k.x, k.y);
    keyCap(c, d, k.id, k.w, k.h);
    c.fillStyle = d.ink;
    c.font = (k.id.length > 1 ? 25 : 31) + "px " + fontFamilies[d.font];
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(labels?.[k.id] ?? k.id, k.w / 2, k.h / 2 - 1);
    c.restore();
  }
}

function floatingArt(c, d, size) {
  c.clearRect(0, 0, size, size);
  const im = imageCache.get(d.floating);
  if (im) {
    const s = size / Math.max(im.width, im.height);
    c.drawImage(
      im,
      (size - im.width * s) / 2,
      (size - im.height * s) / 2,
      im.width * s,
      im.height * s,
    );
  } else if (d.floating && !d.floating.startsWith("img-")) {
    c.save();
    c.font = size * 0.76 + "px sans-serif";
    c.textBaseline = "middle";
    c.textAlign = "center";
    c.lineJoin = "round";
    c.lineWidth = size * 0.045;
    c.strokeStyle = "#FFFBF4";
    c.strokeText(d.floating, size / 2, size / 2);
    c.fillStyle = d.accent;
    c.fillText(d.floating, size / 2, size / 2);
    c.restore();
  }
}
