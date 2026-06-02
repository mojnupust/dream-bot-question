const { createCanvas, GlobalFonts, loadImage } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

// ── Font setup (same as image.service.js) ───────────────────────
const FONTS_DIR = path.join(__dirname, "..", "fonts");
const regularFont = path.join(FONTS_DIR, "NotoSansBengali-Regular.ttf");
const boldFont = path.join(FONTS_DIR, "NotoSansBengali-Bold.ttf");
const latinRegular = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const latinBold = path.join(FONTS_DIR, "NotoSans-Bold.ttf");

if (fs.existsSync(latinRegular))
  GlobalFonts.registerFromPath(latinRegular, "NotoSans");
if (fs.existsSync(latinBold))
  GlobalFonts.registerFromPath(latinBold, "NotoSans");
if (fs.existsSync(regularFont))
  GlobalFonts.registerFromPath(regularFont, "NotoSansBengali");
if (fs.existsSync(boldFont))
  GlobalFonts.registerFromPath(boldFont, "NotoSansBengali");

const FONT =
  '"NotoSansBengali", "NotoSans", sans-serif';

const IMAGES_DIR = path.join(__dirname, "..", "images");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const COUNTER_PATH = path.join(__dirname, "..", "counter.json");

// ── Ensure directories exist ────────────────────────────────────
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ── Counter management ──────────────────────────────────────────
function readCounter() {
  try {
    return JSON.parse(fs.readFileSync(COUNTER_PATH, "utf-8"));
  } catch {
    return { lastQuestionNumber: 0, totalSlidesGenerated: 0, lastRunDate: null };
  }
}

function writeCounter(data) {
  fs.writeFileSync(COUNTER_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Helper: rounded rectangle ───────────────────────────────────
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Helper: wrap text ───────────────────────────────────────────
function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Helper: load owner image if exists ──────────────────────────
async function loadOwnerImage(num) {
  const imgPath = path.join(PUBLIC_DIR, `owner${num}.jpg`);
  if (fs.existsSync(imgPath)) {
    try {
      return await loadImage(imgPath);
    } catch {
      return null;
    }
  }
  return null;
}

// ── Helper: draw circular image ─────────────────────────────────
function drawCircularImage(ctx, img, x, y, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, radius * 2, radius * 2);
  ctx.restore();
}

// ── Color palettes for variety ──────────────────────────────────
const PALETTES = [
  { bg: "#1a1a2e", accent: "#ff6b6b", text: "#ffffff", secondary: "#16213e", border: "#60a5fa" },
  { bg: "#0f172a", accent: "#22d3ee", text: "#f8fafc", secondary: "#1e293b", border: "#38bdf8" },
  { bg: "#18181b", accent: "#f97316", text: "#fafafa", secondary: "#27272a", border: "#fb7185" },
  { bg: "#ffffff", accent: "#4f46e5", text: "#0f172a", secondary: "#eef2ff", border: "#312e81" },
  { bg: "#fef3c7", accent: "#d97706", text: "#1c1917", secondary: "#fffbeb", border: "#92400e" },
  { bg: "#ecfdf5", accent: "#059669", text: "#064e3b", secondary: "#d1fae5", border: "#047857" },
  { bg: "#eff6ff", accent: "#2563eb", text: "#0f172a", secondary: "#dbeafe", border: "#1d4ed8" },
  { bg: "#fdf2f8", accent: "#db2777", text: "#831843", secondary: "#fce7f3", border: "#be185d" },
  { bg: "#f5f3ff", accent: "#7c3aed", text: "#2e1065", secondary: "#ede9fe", border: "#6d28d9" },
  { bg: "#fff7ed", accent: "#ea580c", text: "#431407", secondary: "#ffedd5", border: "#c2410c" },
  { bg: "#0b1120", accent: "#a855f7", text: "#f8fafc", secondary: "#1f2937", border: "#c084fc" },
  { bg: "#111827", accent: "#f59e0b", text: "#f9fafb", secondary: "#1f2937", border: "#fbbf24" },
  { bg: "#fafaf9", accent: "#dc2626", text: "#1c1917", secondary: "#e7e5e4", border: "#b91c1c" },
  { bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a", secondary: "#e2e8f0", border: "#0284c7" },
  { bg: "#fffbeb", accent: "#b45309", text: "#451a03", secondary: "#fde68a", border: "#92400e" },
  { bg: "#f0fdf4", accent: "#16a34a", text: "#14532d", secondary: "#bbf7d0", border: "#15803d" },
  { bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d", secondary: "#fecaca", border: "#dc2626" },
  { bg: "#eef2ff", accent: "#4f46e5", text: "#312e81", secondary: "#c7d2fe", border: "#4338ca" },
  { bg: "#fdf4ff", accent: "#a855f7", text: "#581c87", secondary: "#f5d0fe", border: "#9333ea" },
  { bg: "#f0f9ff", accent: "#0284c7", text: "#0c4a6e", secondary: "#bae6fd", border: "#0369a1" },
  { bg: "#ecfeff", accent: "#0891b2", text: "#164e63", secondary: "#a5f3fc", border: "#0e7490" },
  { bg: "#f7fee7", accent: "#65a30d", text: "#365314", secondary: "#d9f99d", border: "#4d7c0f" },
  { bg: "#fff1f2", accent: "#f43f5e", text: "#4c0519", secondary: "#ffe4e6", border: "#e11d48" },
  { bg: "#f8f8ff", accent: "#6366f1", text: "#1e1b4b", secondary: "#e0e7ff", border: "#4f46e5" },
];

const CTA_TEXTS = [
  "🔥 সঠিক উত্তর কমেন্ট করুন! 💬",
  "💡 আপনি কি পারবেন? কমেন্ট করুন! 🏆",
  "⚡ চ্যালেঞ্জ! সঠিক উত্তর দিন কমেন্টে! 🎯",
  "🧠 আপনার উত্তর কমেন্টে জানান! 📝",
  "🏅 পারলে সঠিক উত্তর বলুন! কমেন্ট করুন! 💪",
  "🎯 কমেন্টে আপনার উত্তর দিন! শেয়ার করুন! 🔄",
];

const STYLE_CONFIGS = [
  { bgVariant: "classic-bar", headerVariant: "split", questionVariant: "card", optionVariant: "solid", columns: 1, ctaVariant: "glow", footerAlign: "left" },
  { bgVariant: "gradient-top", headerVariant: "center", questionVariant: "soft", optionVariant: "outline", columns: 2, ctaVariant: "banner", footerAlign: "center" },
  { bgVariant: "neon-grid", headerVariant: "badge", questionVariant: "glass", optionVariant: "glass", columns: 1, ctaVariant: "electric", footerAlign: "left" },
  { bgVariant: "light-orbs", headerVariant: "right", questionVariant: "frame", optionVariant: "pill", columns: 2, ctaVariant: "glow", footerAlign: "right" },
  { bgVariant: "sunset-band", headerVariant: "banner", questionVariant: "soft", optionVariant: "solid", columns: 1, ctaVariant: "burst", footerAlign: "left" },
  { bgVariant: "mint-glow", headerVariant: "split", questionVariant: "card", optionVariant: "glass", columns: 2, ctaVariant: "banner", footerAlign: "center" },
  { bgVariant: "blueprint", headerVariant: "center", questionVariant: "glass", optionVariant: "outline", columns: 1, ctaVariant: "electric", footerAlign: "left" },
  { bgVariant: "pink-ray", headerVariant: "badge", questionVariant: "frame", optionVariant: "pill", columns: 2, ctaVariant: "glow", footerAlign: "right" },
  { bgVariant: "violet-wave", headerVariant: "split", questionVariant: "soft", optionVariant: "solid", columns: 1, ctaVariant: "glow", footerAlign: "left" },
  { bgVariant: "orange-paper", headerVariant: "right", questionVariant: "card", optionVariant: "outline", columns: 2, ctaVariant: "burst", footerAlign: "center" },
  { bgVariant: "cyber-dark", headerVariant: "banner", questionVariant: "glass", optionVariant: "glass", columns: 1, ctaVariant: "electric", footerAlign: "left" },
  { bgVariant: "gold-dark", headerVariant: "center", questionVariant: "frame", optionVariant: "solid", columns: 2, ctaVariant: "banner", footerAlign: "center" },
  { bgVariant: "newsprint", headerVariant: "split", questionVariant: "frame", optionVariant: "pill", columns: 1, ctaVariant: "glow", footerAlign: "left" },
  { bgVariant: "sky-rings", headerVariant: "badge", questionVariant: "card", optionVariant: "outline", columns: 2, ctaVariant: "burst", footerAlign: "right" },
  { bgVariant: "amber-shine", headerVariant: "right", questionVariant: "soft", optionVariant: "solid", columns: 1, ctaVariant: "banner", footerAlign: "left" },
  { bgVariant: "green-spotlight", headerVariant: "center", questionVariant: "card", optionVariant: "glass", columns: 2, ctaVariant: "glow", footerAlign: "center" },
  { bgVariant: "red-pop", headerVariant: "split", questionVariant: "frame", optionVariant: "pill", columns: 1, ctaVariant: "burst", footerAlign: "left" },
  { bgVariant: "indigo-orbit", headerVariant: "banner", questionVariant: "glass", optionVariant: "outline", columns: 2, ctaVariant: "electric", footerAlign: "right" },
  { bgVariant: "purple-confetti", headerVariant: "badge", questionVariant: "card", optionVariant: "solid", columns: 1, ctaVariant: "glow", footerAlign: "left" },
  { bgVariant: "ocean-grid", headerVariant: "split", questionVariant: "soft", optionVariant: "outline", columns: 2, ctaVariant: "banner", footerAlign: "center" },
  { bgVariant: "cyan-burst", headerVariant: "center", questionVariant: "frame", optionVariant: "pill", columns: 1, ctaVariant: "glow", footerAlign: "left" },
  { bgVariant: "lime-lines", headerVariant: "right", questionVariant: "card", optionVariant: "glass", columns: 2, ctaVariant: "electric", footerAlign: "right", ownerImage: 2, ownerPosition: "left" },
  { bgVariant: "rose-glow", headerVariant: "split", questionVariant: "soft", optionVariant: "solid", columns: 1, ctaVariant: "burst", footerAlign: "left", ownerImage: 3, ownerPosition: "right" },
  { bgVariant: "royal-finish", headerVariant: "banner", questionVariant: "glass", optionVariant: "outline", columns: 2, ctaVariant: "banner", footerAlign: "center", ownerImage: 1, ownerPosition: "center" },
];

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((c) => c + c).join("")
    : normalized;
  const int = parseInt(full, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channels = [r, g, b].map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function readableTextOn(hex) {
  return luminance(hex) > 0.55 ? "#0f172a" : "#ffffff";
}

function safeText(value, fallback = "") {
  const normalized = String(value ?? fallback).trim();
  return normalized || fallback;
}

function getCategoryText(question) {
  const exam = safeText(question.examCategoryName, "General Knowledge");
  const sub = safeText(question.subExamCategoryName, "");
  return sub && sub !== exam ? `${exam} • ${sub}` : exam;
}

function getOptions(question) {
  return [
    { key: "ক", text: safeText(question.optionA, "Option A") },
    { key: "খ", text: safeText(question.optionB, "Option B") },
    { key: "গ", text: safeText(question.optionC, "Option C") },
    { key: "ঘ", text: safeText(question.optionD, "Option D") },
  ];
}

function getCtaText(qNum, styleSeed = 0) {
  return CTA_TEXTS[(qNum + styleSeed - 1) % CTA_TEXTS.length];
}

function fitWrappedText(ctx, text, maxWidth, fontSizes, maxLines, weight = "bold") {
  for (const size of fontSizes) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrapText(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { size, lines };
  }

  const size = fontSizes[fontSizes.length - 1];
  ctx.font = `${weight} ${size}px ${FONT}`;
  const lines = wrapText(ctx, text, maxWidth);
  const trimmed = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = trimmed[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    trimmed[maxLines - 1] = `${last}…`;
  }
  return { size, lines: trimmed };
}

function fillRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 2) {
  roundedRect(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    roundedRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawGlowRect(ctx, x, y, w, h, r, color, alpha = 0.28, blur = 28) {
  ctx.save();
  ctx.shadowColor = rgba(color, alpha);
  ctx.shadowBlur = blur;
  fillRoundRect(ctx, x, y, w, h, r, rgba(color, 0.12));
  ctx.restore();
}

function drawCircle(ctx, x, y, radius, fill, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function drawLine(ctx, x1, y1, x2, y2, color, width = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function drawBackground(ctx, W, H, palette, variant) {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  switch (variant) {
    case "classic-bar": {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(0, 0, W, 10);
      drawCircle(ctx, W - 120, 140, 180, rgba(palette.accent, 0.16));
      drawCircle(ctx, 120, H - 120, 140, rgba(palette.border, 0.12));
      break;
    }
    case "gradient-top": {
      const grad = ctx.createLinearGradient(0, 0, W, 240);
      grad.addColorStop(0, palette.accent);
      grad.addColorStop(1, palette.bg);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, 280);
      drawCircle(ctx, W - 90, 100, 120, rgba("#ffffff", 0.08));
      break;
    }
    case "neon-grid":
    case "blueprint":
    case "ocean-grid": {
      const overlay = ctx.createRadialGradient(W / 2, 200, 80, W / 2, 200, 700);
      overlay.addColorStop(0, rgba(palette.accent, 0.3));
      overlay.addColorStop(1, rgba(palette.bg, 0));
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, W, H);
      for (let x = 0; x <= W; x += 60) drawLine(ctx, x, 0, x, H, rgba(palette.text, 0.08), 1);
      for (let y = 0; y <= H; y += 60) drawLine(ctx, 0, y, W, y, rgba(palette.text, 0.08), 1);
      break;
    }
    case "light-orbs":
    case "orange-paper":
    case "newsprint":
    case "sky-rings":
    case "green-spotlight":
    case "rose-glow": {
      drawCircle(ctx, 120, 120, 130, rgba(palette.accent, 0.12));
      drawCircle(ctx, W - 140, 190, 170, rgba(palette.border, 0.1));
      drawCircle(ctx, W / 2, H - 120, 220, rgba(palette.accent, 0.08));
      break;
    }
    case "sunset-band":
    case "amber-shine": {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, rgba(palette.accent, 0.26));
      grad.addColorStop(0.45, rgba(palette.bg, 0));
      grad.addColorStop(1, rgba(palette.border, 0.12));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgba(palette.accent, 0.2);
      ctx.fillRect(0, 0, W, 150);
      break;
    }
    case "mint-glow": {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, rgba(palette.accent, 0.22));
      grad.addColorStop(0.45, rgba(palette.bg, 0));
      grad.addColorStop(1, rgba(palette.border, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      drawGlowRect(ctx, 70, 90, W - 140, H - 240, 42, palette.accent, 0.12, 60);
      break;
    }
    case "pink-ray":
    case "cyan-burst": {
      drawCircle(ctx, W / 2, 200, 220, rgba(palette.accent, 0.12));
      for (let i = 0; i < 16; i++) {
        const angle = (Math.PI * 2 * i) / 16;
        const x2 = W / 2 + Math.cos(angle) * 520;
        const y2 = 200 + Math.sin(angle) * 520;
        drawLine(ctx, W / 2, 200, x2, y2, rgba(palette.accent, 0.1), 4);
      }
      break;
    }
    case "violet-wave":
    case "indigo-orbit": {
      const grad = ctx.createRadialGradient(W / 2, 100, 40, W / 2, H / 2, 680);
      grad.addColorStop(0, rgba(palette.accent, 0.26));
      grad.addColorStop(1, rgba(palette.bg, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      drawCircle(ctx, 120, H - 150, 220, rgba(palette.border, 0.12));
      drawCircle(ctx, W - 80, 120, 150, rgba(palette.accent, 0.1));
      break;
    }
    case "cyber-dark":
    case "gold-dark": {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, rgba(palette.accent, 0.22));
      grad.addColorStop(0.45, rgba(palette.bg, 0));
      grad.addColorStop(1, rgba(palette.border, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
      drawGlowRect(ctx, 70, 90, W - 140, H - 240, 42, palette.accent, 0.12, 60);
      for (let i = 0; i < 7; i++) {
        drawLine(ctx, -40, 130 + i * 140, W + 40, 70 + i * 140, rgba(palette.border, 0.08), 8);
      }
      break;
    }
    case "red-pop": {
      for (let i = 0; i < 7; i++) {
        drawLine(ctx, -40, 130 + i * 140, W + 40, 70 + i * 140, rgba(palette.border, 0.08), 8);
      }
      drawCircle(ctx, W - 140, 120, 170, rgba(palette.accent, 0.15));
      drawCircle(ctx, 150, H - 180, 190, rgba(palette.border, 0.12));
      break;
    }
    case "purple-confetti": {
      for (let i = 0; i < 24; i++) {
        const x = 40 + (i * 43) % W;
        const y = 80 + ((i * 97) % 900);
        fillRoundRect(ctx, x, y, 20, 8, 4, i % 2 === 0 ? rgba(palette.accent, 0.35) : rgba(palette.border, 0.35));
      }
      break;
    }
    case "lime-lines": {
      for (let i = 0; i < 10; i++) {
        drawLine(ctx, 60 + i * 100, 0, 0 + i * 100, H, rgba(palette.accent, 0.08), 6);
      }
      break;
    }
    case "royal-finish": {
      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, rgba(palette.accent, 0.18));
      grad.addColorStop(1, rgba(palette.border, 0.18));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, 200);
      drawGlowRect(ctx, 70, 90, W - 140, H - 240, 42, palette.accent, 0.12, 60);
      for (let i = 0; i < 7; i++) {
        drawLine(ctx, -40, 130 + i * 140, W + 40, 70 + i * 140, rgba(palette.border, 0.08), 8);
      }
      break;
    }
    default:
      break;
  }
}

function drawHeader(ctx, W, question, qNum, palette, config) {
  const category = getCategoryText(question);
  const badgeTextColor = readableTextOn(palette.accent);
  const headerY = config.headerVariant === "banner" ? 34 : 42;

  if (config.headerVariant === "banner") {
    fillRoundRect(ctx, 40, 30, W - 80, 92, 28, palette.accent, rgba(palette.text, 0.18), 1.5);
    ctx.fillStyle = badgeTextColor;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`প্রশ্ন #${qNum}`, 76, 88);
    ctx.textAlign = "right";
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText("Farhan MCQ", W - 72, 88);
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(badgeTextColor, 0.88);
    ctx.font = `20px ${FONT}`;
    ctx.fillText(category, 74, 130);
    return 160;
  }

  if (config.headerVariant === "center") {
    fillRoundRect(ctx, W / 2 - 110, 38, 220, 52, 26, palette.accent);
    ctx.fillStyle = badgeTextColor;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`প্রশ্ন #${qNum}`, W / 2, 72);
    ctx.fillStyle = palette.text;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText("Farhan MCQ", W / 2, 120);
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = rgba(palette.text, 0.84);
    ctx.fillText(category, W / 2, 154);
    ctx.textAlign = "left";
    return 184;
  }

  if (config.headerVariant === "right") {
    fillRoundRect(ctx, W - 220, 40, 180, 52, 26, palette.accent);
    ctx.fillStyle = badgeTextColor;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`প্রশ্ন #${qNum}`, W - 130, 74);
    ctx.textAlign = "left";
    ctx.fillStyle = palette.text;
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText("Farhan MCQ", 48, 76);
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = rgba(palette.text, 0.84);
    ctx.fillText(category, 48, 120);
    return 160;
  }

  if (config.headerVariant === "badge") {
    fillRoundRect(ctx, 46, 40, 150, 54, 27, palette.accent);
    ctx.fillStyle = badgeTextColor;
    ctx.font = `bold 24px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`প্রশ্ন #${qNum}`, 121, 76);
    ctx.textAlign = "right";
    ctx.fillStyle = palette.text;
    ctx.font = `bold 28px ${FONT}`;
    ctx.fillText("Farhan MCQ", W - 48, 76);
    ctx.textAlign = "left";
    ctx.fillStyle = rgba(palette.text, 0.84);
    ctx.font = `20px ${FONT}`;
    ctx.fillText(category, 48, 126);
    return 162;
  }

  fillRoundRect(ctx, 42, headerY, 180, 54, 27, palette.accent);
  ctx.fillStyle = badgeTextColor;
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন #${qNum}`, 132, headerY + 36);
  ctx.textAlign = "right";
  ctx.fillStyle = palette.text;
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText("Farhan MCQ", W - 42, headerY + 36);
  ctx.textAlign = "left";
  ctx.fillStyle = rgba(palette.text, 0.82);
  ctx.font = `20px ${FONT}`;
  ctx.fillText(category, 44, 124);
  return 160;
}

function drawOwnerPhoto(ctx, W, palette, position, ownerImg) {
  if (!ownerImg) return 0;

  if (position === "left") {
    fillRoundRect(ctx, 30, 24, 86, 86, 43, rgba(palette.bg, 0.82), rgba(palette.accent, 0.35), 2);
    drawCircularImage(ctx, ownerImg, 38, 32, 35);
    return 0;
  }

  if (position === "right") {
    fillRoundRect(ctx, W - 116, 24, 86, 86, 43, rgba(palette.bg, 0.82), rgba(palette.accent, 0.35), 2);
    drawCircularImage(ctx, ownerImg, W - 108, 32, 35);
    return 0;
  }

  fillRoundRect(ctx, W / 2 - 43, 20, 86, 86, 43, rgba(palette.bg, 0.82), rgba(palette.accent, 0.35), 2);
  drawCircularImage(ctx, ownerImg, W / 2 - 35, 28, 35);
  return 18;
}

function drawQuestionBlock(ctx, W, question, palette, config, startY) {
  const boxX = 42;
  const boxW = W - 84;
  const innerW = boxW - 80;
  const questionText = safeText(question.questionText, "প্রশ্ন লোড করা যায়নি");
  const maxLines = config.columns === 2 ? 4 : 5;
  const fitted = fitWrappedText(ctx, questionText, innerW, [44, 40, 36, 34, 32, 30], maxLines, "bold");
  const lineHeight = fitted.size + 14;
  const boxH = 90 + fitted.lines.length * lineHeight;

  if (config.questionVariant === "glass") {
    fillRoundRect(ctx, boxX, startY, boxW, boxH, 30, rgba(palette.secondary, 0.76), rgba(palette.border, 0.36), 2);
    drawGlowRect(ctx, boxX, startY, boxW, boxH, 30, palette.accent, 0.14, 34);
  } else if (config.questionVariant === "frame") {
    fillRoundRect(ctx, boxX, startY, boxW, boxH, 30, rgba(palette.secondary, 0.94), palette.accent, 3);
    fillRoundRect(ctx, boxX + 16, startY + 16, boxW - 32, boxH - 32, 22, rgba(palette.bg, 0.42));
  } else if (config.questionVariant === "soft") {
    fillRoundRect(ctx, boxX, startY, boxW, boxH, 30, rgba(palette.secondary, 0.92), rgba(palette.text, 0.08), 1.5);
    fillRoundRect(ctx, boxX + 20, startY + 20, 10, boxH - 40, 5, palette.accent);
  } else {
    fillRoundRect(ctx, boxX, startY, boxW, boxH, 30, rgba(palette.secondary, 0.96), rgba(palette.border, 0.26), 2);
    fillRoundRect(ctx, boxX, startY, boxW, 12, 6, palette.accent);
  }

  ctx.fillStyle = palette.text;
  ctx.font = `bold ${fitted.size}px ${FONT}`;
  let y = startY + 62;
  for (const line of fitted.lines) {
    ctx.fillText(line, boxX + 38, y);
    y += lineHeight;
  }

  return startY + boxH;
}

function getOptionStyle(palette, variant) {
  switch (variant) {
    case "glass":
      return {
        fill: rgba(palette.secondary, 0.7),
        stroke: rgba(palette.border, 0.42),
        letterFill: palette.accent,
        letterText: readableTextOn(palette.accent),
      };
    case "outline":
      return {
        fill: rgba(palette.secondary, 0.94),
        stroke: palette.border,
        letterFill: rgba(palette.accent, 0.18),
        letterText: palette.text,
      };
    case "pill":
      return {
        fill: rgba(palette.secondary, 0.96),
        stroke: rgba(palette.text, 0.14),
        letterFill: palette.text,
        letterText: readableTextOn(palette.text),
      };
    default:
      return {
        fill: rgba(palette.secondary, 0.96),
        stroke: rgba(palette.border, 0.24),
        letterFill: palette.accent,
        letterText: readableTextOn(palette.accent),
      };
  }
}

function drawOptionCard(ctx, opt, x, y, w, h, palette, config) {
  const style = getOptionStyle(palette, config.optionVariant);
  if (config.optionVariant === "glass") drawGlowRect(ctx, x, y, w, h, 24, palette.accent, 0.14, 24);
  fillRoundRect(ctx, x, y, w, h, 24, style.fill, style.stroke, config.optionVariant === "outline" ? 3 : 2);

  const badgeSize = config.columns === 2 ? 44 : 48;
  fillRoundRect(ctx, x + 18, y + 18, badgeSize, badgeSize, 18, style.letterFill);
  ctx.fillStyle = style.letterText;
  ctx.font = `bold ${config.columns === 2 ? 22 : 24}px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(opt.key, x + 18 + badgeSize / 2, y + 18 + badgeSize / 2 + 8);
  ctx.textAlign = "left";

  const innerX = x + 18 + badgeSize + 18;
  const innerW = w - (innerX - x) - 20;
  const sizeSet = config.columns === 2 ? [22, 20, 18] : [24, 22, 20, 18];
  const fitted = fitWrappedText(ctx, opt.text, innerW, sizeSet, config.columns === 2 ? 3 : 2, "bold");
  const lineHeight = fitted.size + 10;
  const blockHeight = fitted.lines.length * lineHeight;
  let textY = y + h / 2 - blockHeight / 2 + fitted.size - 4;

  ctx.fillStyle = palette.text;
  ctx.font = `bold ${fitted.size}px ${FONT}`;
  for (const line of fitted.lines) {
    ctx.fillText(line, innerX, textY);
    textY += lineHeight;
  }
}

function drawOptionsBlock(ctx, W, question, palette, config, startY) {
  const opts = getOptions(question);
  const columns = config.columns;
  const gap = 18;
  const outerX = 42;
  const outerW = W - 84;
  const colW = columns === 2 ? (outerW - gap) / 2 : outerW;
  const boxH = columns === 2 ? 122 : 88;

  for (let i = 0; i < opts.length; i++) {
    const row = columns === 2 ? Math.floor(i / 2) : i;
    const col = columns === 2 ? i % 2 : 0;
    const x = outerX + col * (colW + gap);
    const y = startY + row * (boxH + gap);
    drawOptionCard(ctx, opts[i], x, y, colW, boxH, palette, config);
  }

  return startY + (columns === 2 ? 2 * boxH + gap : 4 * boxH + 3 * gap);
}

function drawCtaBlock(ctx, W, H, palette, qNum, styleIndex, config) {
  const x = 42;
  const y = H - 210;
  const w = W - 84;
  const h = 118;
  const ctaText = getCtaText(qNum, styleIndex);
  const ctaTextColor = readableTextOn(palette.accent);

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, palette.accent);
  grad.addColorStop(1, palette.border || palette.accent);

  if (config.ctaVariant === "glow" || config.ctaVariant === "electric") {
    drawGlowRect(ctx, x, y, w, h, 30, palette.accent, 0.3, 40);
  }

  fillRoundRect(ctx, x, y, w, h, 30, grad, rgba(palette.text, 0.12), 1.5);

  if (config.ctaVariant === "burst") {
    for (let i = 0; i < 10; i++) {
      drawCircle(ctx, x + 70 + i * 90, y + 20 + (i % 2) * 70, 8, rgba(ctaTextColor, 0.18));
    }
  } else {
    fillRoundRect(ctx, x + 20, y + 18, 110, 34, 17, rgba(ctaTextColor, 0.16));
    fillRoundRect(ctx, x + w - 130, y + 66, 90, 28, 14, rgba(ctaTextColor, 0.16));
  }

  const fitted = fitWrappedText(ctx, ctaText, w - 120, [31, 29, 27, 25], 2, "bold");
  const lineHeight = fitted.size + 10;
  const totalHeight = fitted.lines.length * lineHeight;
  let textY = y + h / 2 - totalHeight / 2 + fitted.size - 4;

  ctx.fillStyle = ctaTextColor;
  ctx.font = `bold ${fitted.size}px ${FONT}`;
  ctx.textAlign = "center";
  for (const line of fitted.lines) {
    ctx.fillText(line, W / 2, textY);
    textY += lineHeight;
  }
  ctx.textAlign = "left";
}

function drawFooter(ctx, W, H, palette, align) {
  const footer = "🌐 farhan-mcq.com | Farhan MCQ";
  ctx.fillStyle = rgba(palette.text, 0.72);
  ctx.font = `18px ${FONT}`;

  if (align === "center") {
    ctx.textAlign = "center";
    ctx.fillText(footer, W / 2, H - 34);
  } else if (align === "right") {
    ctx.textAlign = "right";
    ctx.fillText(footer, W - 40, H - 34);
  } else {
    ctx.textAlign = "left";
    ctx.fillText(footer, 40, H - 34);
  }
  ctx.textAlign = "left";
}

async function renderStyle(ctx, W, H, question, qNum, palette, config, styleIndex) {
  drawBackground(ctx, W, H, palette, config.bgVariant);

  let ownerOffset = 0;
  if (config.ownerImage) {
    const ownerImg = await loadOwnerImage(config.ownerImage);
    ownerOffset = drawOwnerPhoto(ctx, W, palette, config.ownerPosition, ownerImg);
  }

  const headerBottom = drawHeader(ctx, W, question, qNum, palette, config) + ownerOffset;
  const questionBottom = drawQuestionBlock(ctx, W, question, palette, config, headerBottom + 20);
  drawOptionsBlock(ctx, W, question, palette, config, questionBottom + 24);
  drawCtaBlock(ctx, W, H, palette, qNum, styleIndex, config);
  drawFooter(ctx, W, H, palette, config.footerAlign);
}

// ══════════════════════════════════════════════════════════════════
// 24 DIFFERENT SLIDE LAYOUT GENERATORS
// ══════════════════════════════════════════════════════════════════

async function style1(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[0], 0);
}

async function style2(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[1], 1);
}

async function style3(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[2], 2);
}

async function style4(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[3], 3);
}

async function style5(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[4], 4);
}

async function style6(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[5], 5);
}

async function style7(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[6], 6);
}

async function style8(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[7], 7);
}

async function style9(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[8], 8);
}

async function style10(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[9], 9);
}

async function style11(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[10], 10);
}

async function style12(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[11], 11);
}

async function style13(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[12], 12);
}

async function style14(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[13], 13);
}

async function style15(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[14], 14);
}

async function style16(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[15], 15);
}

async function style17(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[16], 16);
}

async function style18(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[17], 17);
}

async function style19(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[18], 18);
}

async function style20(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[19], 19);
}

async function style21(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[20], 20);
}

async function style22(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[21], 21);
}

async function style23(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[22], 22);
}

async function style24(ctx, W, H, question, qNum, palette) {
  await renderStyle(ctx, W, H, question, qNum, palette, STYLE_CONFIGS[23], 23);
}

// ══════════════════════════════════════════════════════════════════
// Array of all style functions
// ══════════════════════════════════════════════════════════════════
const STYLES = [
  style1, style2, style3, style4, style5, style6,
  style7, style8, style9, style10, style11, style12,
  style13, style14, style15, style16, style17, style18,
  style19, style20, style21, style22, style23, style24,
];

/**
 * Generates a single slide image and saves it to the images folder.
 * @param {object} question - question data from API
 * @param {number} questionNumber - sequential question number
 * @param {number} styleIndex - which style to use (0-23)
 * @returns {Promise<string>} - path to saved image
 */
async function generateSlide(question, questionNumber, styleIndex) {
  const W = 1080; // Instagram/Facebook optimal
  const H = 1080;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const palette = PALETTES[styleIndex % PALETTES.length];
  const styleFn = STYLES[styleIndex % STYLES.length];

  await styleFn(ctx, W, H, question, questionNumber, palette);

  // Save to images folder
  const fileName = `question-${questionNumber}-style${styleIndex + 1}.png`;
  const filePath = path.join(IMAGES_DIR, fileName);
  const buffer = await canvas.encode("png");
  fs.writeFileSync(filePath, buffer);

  return filePath;
}

/**
 * Main function: generates 24 slides with 24 questions.
 * Uses counter.json to track sequential numbering.
 * @param {Function} fetchQuestionFn - async function that returns a question object
 * @returns {Promise<{slides: Array<{path: string, questionNumber: number}>, startNum: number, endNum: number}>}
 */
async function generate24Slides(fetchQuestionFn) {
  const counter = readCounter();
  const startNum = counter.lastQuestionNumber + 1;
  const slides = [];

  console.log(`\n📸 Generating 24 slides (Question #${startNum} to #${startNum + 23})...\n`);

  for (let i = 0; i < 24; i++) {
    const qNum = startNum + i;
    const styleIdx = i; // Each slide gets a different style

    try {
      const question = await fetchQuestionFn();
      if (!question) {
        console.error(`⚠️  No question fetched for slide ${i + 1}, skipping...`);
        continue;
      }

      const filePath = await generateSlide(question, qNum, styleIdx);
      slides.push({ path: filePath, questionNumber: qNum, question });
      console.log(`  ✅ Slide ${i + 1}/24 — Question #${qNum} (Style ${styleIdx + 1}) saved`);
    } catch (err) {
      console.error(`  ❌ Slide ${i + 1}/24 failed: ${err.message}`);
    }
  }

  // Update counter
  const endNum = startNum + slides.length - 1;
  counter.lastQuestionNumber = endNum;
  counter.totalSlidesGenerated += slides.length;
  counter.lastRunDate = new Date().toISOString();
  writeCounter(counter);

  console.log(`\n✨ Generated ${slides.length} slides (Question #${startNum} to #${endNum})`);
  console.log(`📊 Total slides ever generated: ${counter.totalSlidesGenerated}`);
  console.log(`💾 Saved to: ${IMAGES_DIR}\n`);

  return { slides, startNum, endNum };
}

module.exports = {
  generateSlide,
  generate24Slides,
  readCounter,
  writeCounter,
  IMAGES_DIR,
};
