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
  { bg: "#1a1a2e", accent: "#e94560", text: "#ffffff", secondary: "#16213e" },
  { bg: "#0f3460", accent: "#e94560", text: "#ffffff", secondary: "#533483" },
  { bg: "#ffffff", accent: "#4F46E5", text: "#1a1a2e", secondary: "#f3f4f6" },
  { bg: "#fef3c7", accent: "#d97706", text: "#1c1917", secondary: "#fffbeb" },
  { bg: "#ecfdf5", accent: "#059669", text: "#064e3b", secondary: "#d1fae5" },
  { bg: "#eff6ff", accent: "#2563eb", text: "#1e3a5f", secondary: "#dbeafe" },
  { bg: "#fdf2f8", accent: "#db2777", text: "#831843", secondary: "#fce7f3" },
  { bg: "#f5f3ff", accent: "#7c3aed", text: "#4c1d95", secondary: "#ede9fe" },
  { bg: "#fff7ed", accent: "#ea580c", text: "#431407", secondary: "#fed7aa" },
  { bg: "#f0fdfa", accent: "#0d9488", text: "#134e4a", secondary: "#ccfbf1" },
  { bg: "#1e293b", accent: "#38bdf8", text: "#f1f5f9", secondary: "#334155" },
  { bg: "#18181b", accent: "#fbbf24", text: "#fafafa", secondary: "#27272a" },
  { bg: "#fafaf9", accent: "#dc2626", text: "#1c1917", secondary: "#e7e5e4" },
  { bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a", secondary: "#e2e8f0" },
  { bg: "#fffbeb", accent: "#b45309", text: "#451a03", secondary: "#fde68a" },
  { bg: "#f0fdf4", accent: "#16a34a", text: "#14532d", secondary: "#bbf7d0" },
  { bg: "#fef2f2", accent: "#ef4444", text: "#7f1d1d", secondary: "#fecaca" },
  { bg: "#eef2ff", accent: "#4f46e5", text: "#312e81", secondary: "#c7d2fe" },
  { bg: "#fdf4ff", accent: "#a855f7", text: "#581c87", secondary: "#f5d0fe" },
  { bg: "#f0f9ff", accent: "#0284c7", text: "#0c4a6e", secondary: "#bae6fd" },
  { bg: "#ecfeff", accent: "#0891b2", text: "#164e63", secondary: "#a5f3fc" },
  { bg: "#f7fee7", accent: "#65a30d", text: "#365314", secondary: "#d9f99d" },
  { bg: "#fff1f2", accent: "#f43f5e", text: "#4c0519", secondary: "#ffe4e6" },
  { bg: "#f8f8ff", accent: "#6366f1", text: "#1e1b4b", secondary: "#e0e7ff" },
];

// ══════════════════════════════════════════════════════════════════
// 24 DIFFERENT SLIDE LAYOUT GENERATORS
// ══════════════════════════════════════════════════════════════════

// Style 1: Classic Card - Clean professional look
async function style1(ctx, W, H, question, qNum, palette) {
  // Background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  // Top accent bar
  ctx.fillStyle = palette.accent;
  ctx.fillRect(0, 0, W, 8);

  // Question number badge
  ctx.fillStyle = palette.accent;
  roundedRect(ctx, 40, 40, 120, 50, 25);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন #${qNum}`, 100, 72);
  ctx.textAlign = "left";

  // Brand name
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("Farhan MCQ", W - 40, 72);
  ctx.textAlign = "left";

  // Category
  ctx.fillStyle = palette.text + "99";
  ctx.font = `20px ${FONT}`;
  ctx.fillText(question.examCategoryName, 40, 130);

  // Question text
  ctx.fillStyle = palette.text;
  ctx.font = `bold 32px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 180;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 44;
  }

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? palette.accent + "30" : palette.secondary;
    roundedRect(ctx, 40, y, W - 80, 60, 12);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = palette.text;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 70, y + 38);
    if (isCorrect) {
      ctx.fillStyle = palette.accent;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓ সঠিক", W - 60, y + 38);
      ctx.textAlign = "left";
    }
    y += 74;
  }

  // Footer
  ctx.fillStyle = palette.text + "66";
  ctx.font = `18px ${FONT}`;
  ctx.fillText("🌐 farhan-mcq.com | ফলো করুন!", 40, H - 40);
}

// Style 2: Gradient Header - Bold gradient top section
async function style2(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = palette.secondary;
  ctx.fillRect(0, 0, W, H);

  // Gradient header
  const grad = ctx.createLinearGradient(0, 0, W, 200);
  grad.addColorStop(0, palette.accent);
  grad.addColorStop(1, palette.bg === "#ffffff" ? "#6366f1" : palette.accent + "cc");
  ctx.fillStyle = grad;
  roundedRect(ctx, 0, 0, W, 220, 0);
  ctx.fill();

  // Question number in header
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 48px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন নং ${qNum}`, W / 2, 80);

  // Category in header
  ctx.font = `22px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, 130);

  // Brand
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText("📚 Farhan MCQ", W / 2, 180);
  ctx.textAlign = "left";

  // Question body
  ctx.fillStyle = palette.text;
  ctx.font = `bold 30px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 270;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 42;
  }

  // Options in 2x2 grid
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  const gridW = (W - 100) / 2;
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const ox = 40 + col * (gridW + 20);
    const oy = y + row * 80;
    const isCorrect = opts[i].letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#d1fae5" : "#ffffff";
    roundedRect(ctx, ox, oy, gridW, 65, 12);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    ctx.fillStyle = palette.text;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`${opts[i].key}) ${opts[i].text}`, ox + 16, oy + 40);
  }

  // Footer
  ctx.fillStyle = palette.text + "88";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("প্রতিদিন ২৪টি নতুন প্রশ্ন | farhan-mcq.com", W / 2, H - 30);
  ctx.textAlign = "left";
}

// Style 3: Dark Mode Premium
async function style3(ctx, W, H, question, qNum, palette) {
  // Dark background
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, W, H);

  // Glow effect circle
  ctx.fillStyle = palette.accent + "15";
  ctx.beginPath();
  ctx.arc(W - 100, 100, 200, 0, Math.PI * 2);
  ctx.fill();

  // Number circle
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(80, 80, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`${qNum}`, 80, 88);
  ctx.textAlign = "left";

  // Brand
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 26px ${FONT}`;
  ctx.fillText("Farhan MCQ", 140, 88);

  // Divider
  ctx.strokeStyle = palette.accent + "44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 140);
  ctx.lineTo(W - 40, 140);
  ctx.stroke();

  // Category
  ctx.fillStyle = palette.accent;
  ctx.font = `18px ${FONT}`;
  ctx.fillText(`📂 ${question.examCategoryName} | ${question.subExamCategoryName}`, 40, 175);

  // Question
  ctx.fillStyle = "#f1f5f9";
  ctx.font = `bold 30px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 220;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 42;
  }

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#10b98133" : "#1e293b";
    roundedRect(ctx, 40, y, W - 80, 58, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#10b981" : "#334155";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isCorrect ? "#6ee7b7" : "#e2e8f0";
    ctx.font = `22px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 70, y + 36);
    y += 72;
  }

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("🌐 farhan-mcq.com | চাকরি প্রস্তুতির সেরা প্ল্যাটফর্ম", W / 2, H - 30);
  ctx.textAlign = "left";
}

// Style 4: Split Layout - Left accent panel
async function style4(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Left accent panel
  const panelW = 100;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, palette.accent);
  grad.addColorStop(1, "#7c3aed");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, panelW, H);

  // Question number on panel (vertical)
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 36px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`#${qNum}`, panelW / 2, 60);
  ctx.restore();

  // Brand on panel
  ctx.save();
  ctx.translate(panelW / 2, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "#ffffff99";
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("FARHAN MCQ", 0, 6);
  ctx.restore();

  // Content area
  const cx = panelW + 40;

  // Category
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(question.examCategoryName, cx, 50);

  // Question
  ctx.fillStyle = "#1a1a2e";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - panelW - 100);
  let y = 90;
  for (const line of lines) {
    ctx.fillText(line, cx, y);
    y += 40;
  }

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#ecfdf5" : "#f9fafb";
    roundedRect(ctx, cx, y, W - panelW - 90, 55, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#10b981" : "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, cx + 16, y + 34);
    if (isCorrect) {
      ctx.fillStyle = "#10b981";
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓", W - 50, y + 34);
      ctx.textAlign = "left";
    }
    y += 68;
  }

  // Footer
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.fillText("farhan-mcq.com", cx, H - 30);
}

// Style 5: Bubble Style - Rounded modern
async function style5(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative circles
  ctx.fillStyle = palette.accent + "15";
  ctx.beginPath();
  ctx.arc(W - 80, 80, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(60, H - 60, 80, 0, Math.PI * 2);
  ctx.fill();

  // Header bubble
  ctx.fillStyle = palette.accent;
  roundedRect(ctx, 30, 30, W - 60, 80, 40);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`📚 প্রশ্ন নং ${qNum} | Farhan MCQ`, W / 2, 80);
  ctx.textAlign = "left";

  // Sub category
  ctx.fillStyle = palette.text + "88";
  ctx.font = `18px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`${question.examCategoryName} — ${question.subExamCategoryName}`, W / 2, 140);
  ctx.textAlign = "left";

  // Question in bubble
  ctx.fillStyle = palette.secondary;
  roundedRect(ctx, 40, 165, W - 80, 140, 20);
  ctx.fill();
  ctx.fillStyle = palette.text;
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 140);
  let y = 200;
  for (const line of lines) {
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, y);
    y += 36;
  }
  ctx.textAlign = "left";

  // Options as bubbles
  y = 330;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#d1fae5" : "#ffffff";
    roundedRect(ctx, 50, y, W - 100, 55, 28);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#10b981" : "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = palette.text;
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}${isCorrect ? " ✅" : ""}`, W / 2, y + 34);
    y += 68;
  }
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = palette.text + "66";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("প্রতিদিন চর্চা করুন | farhan-mcq.com", W / 2, H - 30);
  ctx.textAlign = "left";
}

// Style 6: Minimalist with accent line
async function style6(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Top thin line
  ctx.fillStyle = palette.accent;
  ctx.fillRect(40, 30, 60, 4);

  // Question number
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`Question ${qNum}`, 40, 65);

  // Brand
  ctx.fillStyle = "#9ca3af";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("Farhan MCQ", W - 40, 65);
  ctx.textAlign = "left";

  // Category
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, 40, 100);

  // Large question text
  ctx.fillStyle = "#111827";
  ctx.font = `bold 34px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 160;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 48;
  }

  // Accent line before options
  y += 10;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(40, y, W - 80, 3);
  y += 30;

  // Options
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    if (isCorrect) {
      ctx.fillStyle = palette.accent;
      ctx.fillRect(40, y - 4, 4, 30);
    }
    ctx.fillStyle = isCorrect ? palette.accent : "#374151";
    ctx.font = `${isCorrect ? "bold " : ""}22px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}${isCorrect ? " ←" : ""}`, 56, y + 18);
    y += 50;
  }

  // Bottom
  ctx.fillStyle = "#d1d5db";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | সরকারি চাকরি প্রস্তুতি", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 7: Instagram Story Style (bold colors)
async function style7(ctx, W, H, question, qNum, palette) {
  // Full gradient background
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#667eea");
  grad.addColorStop(1, "#764ba2");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Semi-transparent card
  ctx.fillStyle = "#ffffff22";
  roundedRect(ctx, 30, 30, W - 60, H - 60, 24);
  ctx.fill();

  // Question number
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 60px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`#${qNum}`, W / 2, 100);

  // Brand
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("Farhan MCQ", W / 2, 140);

  // Category
  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = "#ffffffcc";
  ctx.fillText(question.examCategoryName, W / 2, 175);

  // Question
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = 230;
  for (const line of lines) {
    ctx.fillText(line, W / 2, y);
    y += 40;
  }

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#10b981cc" : "#ffffff33";
    roundedRect(ctx, 50, y, W - 100, 55, 14);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, W / 2, y + 34);
    y += 68;
  }
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = "#ffffffaa";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("💡 প্রতিদিন নতুন প্রশ্ন | farhan-mcq.com", W / 2, H - 40);
  ctx.textAlign = "left";
}

// Style 8: Newspaper/Editorial Style
async function style8(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#faf9f6";
  ctx.fillRect(0, 0, W, H);

  // Top double border
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 30);
  ctx.lineTo(W - 30, 30);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 36);
  ctx.lineTo(W - 30, 36);
  ctx.stroke();

  // Header text
  ctx.fillStyle = "#1a1a2e";
  ctx.font = `bold 36px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("FARHAN MCQ", W / 2, 75);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = "#6b7280";
  ctx.fillText(`প্রশ্ন সংখ্যা: ${qNum} | ${question.examCategoryName}`, W / 2, 105);
  ctx.textAlign = "left";

  // Separator
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 120);
  ctx.lineTo(W - 30, 120);
  ctx.stroke();

  // Question
  ctx.fillStyle = "#1a1a2e";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 170;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 40;
  }

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#1a1a2e" : "#4b5563";
    ctx.font = `${isCorrect ? "bold " : ""}22px ${FONT}`;
    ctx.fillText(`${opt.key}. ${opt.text}${isCorrect ? " ★" : ""}`, 60, y);
    y += 48;
  }

  // Bottom border
  ctx.strokeStyle = "#1a1a2e";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, H - 50);
  ctx.lineTo(W - 30, H - 50);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, H - 44);
  ctx.lineTo(W - 30, H - 44);
  ctx.stroke();

  ctx.fillStyle = "#6b7280";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | চাকরি পরীক্ষা প্রস্তুতি", W / 2, H - 20);
  ctx.textAlign = "left";
}

// Style 9: Neon Glow on Dark
async function style9(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, W, H);

  // Neon border
  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 15;
  roundedRect(ctx, 20, 20, W - 40, H - 40, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Question number with glow
  ctx.fillStyle = "#00ff88";
  ctx.shadowColor = "#00ff88";
  ctx.shadowBlur = 10;
  ctx.font = `bold 44px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`⚡ প্রশ্ন ${qNum}`, W / 2, 80);
  ctx.shadowBlur = 0;

  // Brand
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("Farhan MCQ", W / 2, 120);

  // Category
  ctx.fillStyle = "#00ff8899";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, 150);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = 200;
  for (const line of lines) {
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, y);
    y += 38;
  }
  ctx.textAlign = "left";

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    if (isCorrect) {
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00ff88";
      ctx.shadowBlur = 8;
      roundedRect(ctx, 50, y, W - 100, 52, 10);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = isCorrect ? "#00ff88" : "#cccccc";
    ctx.font = `${isCorrect ? "bold " : ""}20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}`, W / 2, y + 34);
    y += 64;
  }
  ctx.textAlign = "left";

  // Footer
  ctx.fillStyle = "#666666";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("🌐 farhan-mcq.com", W / 2, H - 35);
  ctx.textAlign = "left";
}

// Style 10: Warm Sunset Theme
async function style10(ctx, W, H, question, qNum, palette) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#fff7ed");
  grad.addColorStop(1, "#fef3c7");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Top banner
  ctx.fillStyle = "#ea580c";
  roundedRect(ctx, 0, 0, W, 70, 0);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`Farhan MCQ — প্রশ্ন #${qNum}`, W / 2, 46);
  ctx.textAlign = "left";

  // Category badge
  ctx.fillStyle = "#ea580c22";
  roundedRect(ctx, W / 2 - 100, 85, 200, 32, 16);
  ctx.fill();
  ctx.fillStyle = "#ea580c";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(question.examCategoryName, W / 2, 107);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#431407";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 155;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 40;
  }

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#fed7aa" : "#ffffff";
    roundedRect(ctx, 40, y, W - 80, 55, 12);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#ea580c" : "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#431407";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 60, y + 34);
    if (isCorrect) {
      ctx.fillStyle = "#ea580c";
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓ সঠিক", W - 60, y + 34);
      ctx.textAlign = "left";
    }
    y += 68;
  }

  ctx.fillStyle = "#9a3412";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("🔥 farhan-mcq.com | প্রতিদিন প্র্যাকটিস!", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 11: Blue Ocean Professional
async function style11(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#f0f9ff";
  ctx.fillRect(0, 0, W, H);

  // Side accent
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, 0, 12, H);

  // Header area
  ctx.fillStyle = "#0284c7";
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText(`📖 Farhan MCQ`, 40, 50);

  // Question badge
  ctx.fillStyle = "#0284c7";
  roundedRect(ctx, W - 160, 25, 130, 40, 20);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন ${qNum}`, W - 95, 52);
  ctx.textAlign = "left";

  // Category
  ctx.fillStyle = "#0c4a6e";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(`${question.examCategoryName} > ${question.subExamCategoryName}`, 40, 90);

  // Card for question
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 30, 110, W - 60, 140, 12);
  ctx.fill();
  ctx.shadowColor = "#00000011";
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = 150;
  for (const line of lines) {
    ctx.fillText(line, 55, y);
    y += 38;
  }

  // Options
  y = 280;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#e0f2fe" : "#ffffff";
    roundedRect(ctx, 40, y, W - 80, 52, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#0284c7" : "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 65, y + 33);
    y += 64;
  }

  ctx.fillStyle = "#64748b";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | বাংলাদেশ চাকরি প্রস্তুতি", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 12: Geometric Pattern Background
async function style12(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#1e1b4b";
  ctx.fillRect(0, 0, W, H);

  // Geometric pattern
  ctx.strokeStyle = "#4f46e522";
  ctx.lineWidth = 1;
  for (let i = 0; i < W; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, H);
    ctx.stroke();
  }
  for (let i = 0; i < H; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(W, i);
    ctx.stroke();
  }

  // Main card overlay
  ctx.fillStyle = "#ffffffee";
  roundedRect(ctx, 40, 60, W - 80, H - 120, 20);
  ctx.fill();

  // Question number
  ctx.fillStyle = "#4f46e5";
  ctx.font = `bold 40px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন ${qNum}`, W / 2, 120);

  // Brand
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText("Farhan MCQ", W / 2, 155);

  // Category
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, 185);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#1e1b4b";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 160);
  let y = 225;
  for (const line of lines) {
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, y);
    y += 38;
  }
  ctx.textAlign = "left";

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#ede9fe" : "#f9fafb";
    roundedRect(ctx, 70, y, W - 140, 50, 10);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#1e1b4b";
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}${isCorrect ? " ✓" : ""}`, W / 2, y + 32);
    y += 62;
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "#6b7280";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com", W / 2, H - 45);
  ctx.textAlign = "left";
}

// Style 13: Diagonal Split
async function style13(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Diagonal accent
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.lineTo(W, 160);
  ctx.lineTo(0, 100);
  ctx.closePath();
  ctx.fill();

  // Header text
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 32px ${FONT}`;
  ctx.fillText(`প্রশ্ন #${qNum}`, 40, 55);
  ctx.font = `20px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("Farhan MCQ", W - 40, 55);
  ctx.textAlign = "left";

  // Category
  ctx.fillStyle = "#ffffff99";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, 40, 85);

  // Question
  ctx.fillStyle = "#1f2937";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 180;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 40;
  }

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? palette.accent + "20" : "#f3f4f6";
    roundedRect(ctx, 40, y, W - 80, 55, 10);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#1f2937";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 60, y + 34);
    y += 68;
  }

  ctx.fillStyle = "#9ca3af";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | সরকারি চাকরি পরীক্ষা প্রস্তুতি", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 14: Flashcard Style (Front/Back feel)
async function style14(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Card shadow effect
  ctx.fillStyle = "#00000011";
  roundedRect(ctx, 35, 35, W - 60, H - 60, 20);
  ctx.fill();

  // Main card
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, 30, 30, W - 60, H - 60, 20);
  ctx.fill();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Top badge
  ctx.fillStyle = "#ef4444";
  roundedRect(ctx, W / 2 - 70, 45, 140, 36, 18);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 18px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন নং ${qNum}`, W / 2, 70);
  ctx.textAlign = "left";

  // Brand
  ctx.fillStyle = "#ef4444";
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText("📚 Farhan MCQ", 55, 115);

  // Category
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(question.examCategoryName, W - 55, 115);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#111827";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 140);
  let y = 160;
  for (const line of lines) {
    ctx.fillText(line, 55, y);
    y += 38;
  }

  // Divider
  y += 10;
  ctx.strokeStyle = "#e5e7eb";
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(55, y);
  ctx.lineTo(W - 55, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += 20;

  // Options
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#fef2f2" : "#f9fafb";
    roundedRect(ctx, 55, y, W - 110, 50, 8);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = isCorrect ? "#ef4444" : "#374151";
    ctx.font = `${isCorrect ? "bold " : ""}20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 75, y + 32);
    y += 60;
  }

  ctx.fillStyle = "#9ca3af";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("প্রতিদিন প্র্যাকটিস | farhan-mcq.com", W / 2, H - 50);
  ctx.textAlign = "left";
}

// Style 15: Green Nature Theme
async function style15(ctx, W, H, question, qNum, palette) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#ecfdf5");
  grad.addColorStop(1, "#d1fae5");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Leaf-like decorative element
  ctx.fillStyle = "#10b98122";
  ctx.beginPath();
  ctx.arc(-50, -50, 200, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W + 30, H + 30, 150, 0, Math.PI * 2);
  ctx.fill();

  // Header
  ctx.fillStyle = "#065f46";
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`🌿 প্রশ্ন ${qNum} — Farhan MCQ`, W / 2, 60);

  ctx.fillStyle = "#047857";
  ctx.font = `18px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, 95);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#064e3b";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 145;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 40;
  }

  // Options
  y += 25;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#a7f3d0" : "#ffffff";
    roundedRect(ctx, 40, y, W - 80, 55, 12);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#059669" : "#d1fae5";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#064e3b";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 60, y + 35);
    if (isCorrect) {
      ctx.fillStyle = "#059669";
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓ সঠিক উত্তর", W - 55, y + 35);
      ctx.textAlign = "left";
    }
    y += 68;
  }

  ctx.fillStyle = "#047857";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | প্রতিদিন শিখুন, এগিয়ে যান!", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 16: Purple Galaxy
async function style16(ctx, W, H, question, qNum, palette) {
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1e1b4b");
  grad.addColorStop(0.5, "#312e81");
  grad.addColorStop(1, "#4c1d95");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Stars effect
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 50; i++) {
    ctx.globalAlpha = Math.random() * 0.5 + 0.2;
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Header
  ctx.fillStyle = "#e9d5ff";
  ctx.font = `bold 36px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`✨ প্রশ্ন #${qNum}`, W / 2, 65);
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = "#c4b5fd";
  ctx.fillText("Farhan MCQ", W / 2, 100);
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, 130);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 180;
  for (const line of lines) {
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, y);
    y += 38;
  }
  ctx.textAlign = "left";

  // Options
  y += 25;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#7c3aed55" : "#1e1b4b99";
    roundedRect(ctx, 50, y, W - 100, 52, 12);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#a78bfa" : "#4c1d9566";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isCorrect ? "#e9d5ff" : "#c4b5fd";
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}`, W / 2, y + 34);
    y += 64;
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "#a78bfa88";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | জ্ঞানের আলো ছড়াই", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 17: Bold Typography Focus
async function style17(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#fafafa";
  ctx.fillRect(0, 0, W, H);

  // Large number in background
  ctx.fillStyle = "#f3f4f6";
  ctx.font = `bold 200px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(`${qNum}`, W - 20, 200);
  ctx.textAlign = "left";

  // Brand
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText("Farhan MCQ", 40, 45);

  // Category
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, 40, 75);

  // Question (large bold)
  ctx.fillStyle = "#111827";
  ctx.font = `bold 32px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 140;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 46;
  }

  // Accent underline
  y += 5;
  ctx.fillStyle = palette.accent;
  ctx.fillRect(40, y, 80, 4);
  y += 30;

  // Options
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? palette.accent : "#6b7280";
    ctx.font = `${isCorrect ? "bold 24" : "22"}px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 50, y);
    if (isCorrect) {
      const tw = ctx.measureText(`${opt.key}) ${opt.text}`).width;
      ctx.fillStyle = palette.accent;
      ctx.fillRect(50, y + 6, tw, 3);
    }
    y += 50;
  }

  ctx.fillStyle = "#d1d5db";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 18: Bordered Card with Owner Photo
async function style18(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Thick colored border
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 8;
  roundedRect(ctx, 15, 15, W - 30, H - 30, 16);
  ctx.stroke();

  // Corner decorations
  ctx.fillStyle = palette.accent;
  roundedRect(ctx, 15, 15, 50, 50, 8);
  ctx.fill();
  roundedRect(ctx, W - 65, 15, 50, 50, 8);
  ctx.fill();

  // Header with possible owner photo
  ctx.fillStyle = palette.accent;
  ctx.font = `bold 26px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`Farhan MCQ — প্রশ্ন ${qNum}`, W / 2, 60);

  // Try to load owner image
  const ownerImg = await loadOwnerImage(1);
  if (ownerImg) {
    drawCircularImage(ctx, ownerImg, W / 2 - 25, 75, 25);
  }

  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, W / 2, ownerImg ? 140 : 95);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#1f2937";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = ownerImg ? 175 : 135;
  for (const line of lines) {
    ctx.fillText(line, 45, y);
    y += 38;
  }

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? palette.accent + "22" : "#f9fafb";
    roundedRect(ctx, 40, y, W - 80, 52, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? palette.accent : "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1f2937";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 60, y + 33);
    y += 62;
  }

  ctx.fillStyle = palette.accent;
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | ফলো করুন!", W / 2, H - 35);
  ctx.textAlign = "left";
}

// Style 19: Rounded Tags Style
async function style19(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, W, H);

  // Top colored section
  ctx.fillStyle = "#0f172a";
  roundedRect(ctx, 0, 0, W, 130, 0);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("Farhan MCQ", W / 2, 45);

  // Tags row
  ctx.fillStyle = "#38bdf8";
  roundedRect(ctx, W / 2 - 140, 60, 120, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#f59e0b";
  roundedRect(ctx, W / 2 + 20, 60, 120, 30, 15);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 14px ${FONT}`;
  ctx.fillText(`প্রশ্ন #${qNum}`, W / 2 - 80, 81);
  ctx.fillText(question.examCategoryName.slice(0, 12), W / 2 + 80, 81);
  ctx.textAlign = "left";

  // Sub category
  ctx.fillStyle = "#ffffffaa";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(question.subExamCategoryName, W / 2, 115);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 175;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 38;
  }

  // Options
  y += 25;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#dbeafe" : "#ffffff";
    roundedRect(ctx, 40, y, W - 80, 52, 26);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#2563eb" : "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#0f172a";
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}${isCorrect ? " ✅" : ""}`, W / 2, y + 34);
    y += 64;
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "#64748b";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("প্রতিদিন ২৪টি প্রশ্ন | farhan-mcq.com", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 20: Spotlight Center
async function style20(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, W, H);

  // Spotlight gradient from center
  const radGrad = ctx.createRadialGradient(W / 2, H / 3, 50, W / 2, H / 3, 400);
  radGrad.addColorStop(0, "#27272a");
  radGrad.addColorStop(1, "#18181b");
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, W, H);

  // Brand top-left
  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillText("Farhan MCQ", 30, 40);

  // Question number top-right
  ctx.fillStyle = "#fbbf24";
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(`#${qNum}`, W - 30, 40);
  ctx.textAlign = "left";

  // Category
  ctx.fillStyle = "#a1a1aa";
  ctx.font = `16px ${FONT}`;
  ctx.fillText(question.examCategoryName, 30, 75);

  // Question (centered, golden)
  ctx.fillStyle = "#fef3c7";
  ctx.font = `bold 28px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 100);
  let y = 130;
  for (const line of lines) {
    ctx.textAlign = "center";
    ctx.fillText(line, W / 2, y);
    y += 40;
  }
  ctx.textAlign = "left";

  // Options
  y += 30;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#fbbf2433" : "#27272a";
    roundedRect(ctx, 50, y, W - 100, 52, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#fbbf24" : "#3f3f46";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = isCorrect ? "#fbbf24" : "#e4e4e7";
    ctx.font = `20px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(`${opt.key}) ${opt.text}`, W / 2, y + 34);
    y += 64;
  }
  ctx.textAlign = "left";

  ctx.fillStyle = "#71717a";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("🌟 farhan-mcq.com | জ্ঞানই শক্তি", W / 2, H - 25);
  ctx.textAlign = "left";
}

// Style 21: Retro/Vintage
async function style21(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#faf5e4";
  ctx.fillRect(0, 0, W, H);

  // Vintage border
  ctx.strokeStyle = "#8b5e3c";
  ctx.lineWidth = 4;
  roundedRect(ctx, 20, 20, W - 40, H - 40, 4);
  ctx.stroke();
  ctx.lineWidth = 1;
  roundedRect(ctx, 28, 28, W - 56, H - 56, 2);
  ctx.stroke();

  // Header
  ctx.fillStyle = "#5c3317";
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`— প্রশ্ন ${qNum} —`, W / 2, 70);
  ctx.font = `20px ${FONT}`;
  ctx.fillText("Farhan MCQ", W / 2, 100);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = "#8b5e3c";
  ctx.fillText(question.examCategoryName, W / 2, 130);
  ctx.textAlign = "left";

  // Decorative line
  ctx.strokeStyle = "#8b5e3c";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(80, 145);
  ctx.lineTo(W - 80, 145);
  ctx.stroke();

  // Question
  ctx.fillStyle = "#3d2b1f";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = 185;
  for (const line of lines) {
    ctx.fillText(line, 50, y);
    y += 38;
  }

  // Options
  y += 25;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#5c3317" : "#6b5843";
    ctx.font = `${isCorrect ? "bold " : ""}20px ${FONT}`;
    ctx.fillText(`  ${opt.key}) ${opt.text}${isCorrect ? " ✦" : ""}`, 55, y);
    y += 48;
  }

  ctx.fillStyle = "#8b5e3c";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | পরীক্ষা প্রস্তুতির সঙ্গী", W / 2, H - 40);
  ctx.textAlign = "left";
}

// Style 22: Gradient Mesh Modern
async function style22(ctx, W, H, question, qNum, palette) {
  // Multi-color gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#fce4ec");
  grad.addColorStop(0.33, "#e8eaf6");
  grad.addColorStop(0.66, "#e0f7fa");
  grad.addColorStop(1, "#f1f8e9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Glassmorphism card
  ctx.fillStyle = "#ffffffbb";
  roundedRect(ctx, 30, 30, W - 60, H - 60, 20);
  ctx.fill();
  ctx.strokeStyle = "#ffffff88";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  ctx.fillStyle = "#1a237e";
  ctx.font = `bold 30px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText(`প্রশ্ন নং ${qNum}`, W / 2, 80);
  ctx.font = `bold 20px ${FONT}`;
  ctx.fillStyle = "#283593";
  ctx.fillText("Farhan MCQ", W / 2, 115);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = "#5c6bc0";
  ctx.fillText(question.examCategoryName, W / 2, 145);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#1a237e";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 120);
  let y = 190;
  for (const line of lines) {
    ctx.fillText(line, 55, y);
    y += 38;
  }

  // Options
  y += 20;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#c5cae9" : "#ffffff88";
    roundedRect(ctx, 50, y, W - 100, 50, 12);
    ctx.fill();
    if (isCorrect) {
      ctx.strokeStyle = "#3f51b5";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#1a237e";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 70, y + 32);
    y += 60;
  }

  ctx.fillStyle = "#5c6bc0";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | সেরা প্রস্তুতি নিন", W / 2, H - 40);
  ctx.textAlign = "left";
}

// Style 23: Branded with Owner (Photo emphasis)
async function style23(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, W, H);

  // Top brand bar
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(0, 0, W, 100);

  // Owner photo attempt
  const ownerImg = await loadOwnerImage(2);
  if (ownerImg) {
    drawCircularImage(ctx, ownerImg, 20, 15, 35);
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText("Farhan MCQ", ownerImg ? 100 : 30, 45);
  ctx.font = `16px ${FONT}`;
  ctx.fillText(`প্রশ্ন #${qNum} | ${question.examCategoryName}`, ownerImg ? 100 : 30, 75);

  // Question
  ctx.fillStyle = "#1e293b";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 80);
  let y = 140;
  for (const line of lines) {
    ctx.fillText(line, 40, y);
    y += 38;
  }

  // Options
  y += 25;
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (const opt of opts) {
    const isCorrect = opt.letter === question.correctAnswer;
    ctx.fillStyle = isCorrect ? "#dbeafe" : "#f1f5f9";
    roundedRect(ctx, 30, y, W - 60, 52, 10);
    ctx.fill();
    ctx.strokeStyle = isCorrect ? "#1e40af" : "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1e293b";
    ctx.font = `20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 55, y + 34);
    if (isCorrect) {
      ctx.fillStyle = "#1e40af";
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓ সঠিক", W - 50, y + 34);
      ctx.textAlign = "left";
    }
    y += 64;
  }

  // Footer
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = "#ffffff";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("ফলো করুন — farhan-mcq.com | Facebook | Instagram", W / 2, H - 16);
  ctx.textAlign = "left";
}

// Style 24: Colorful Blocks
async function style24(ctx, W, H, question, qNum, palette) {
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Colorful top blocks
  const colors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];
  const blockW = W / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * blockW, 0, blockW, 10);
  }

  // Owner photo
  const ownerImg = await loadOwnerImage(3);
  let headerOffset = 40;
  if (ownerImg) {
    drawCircularImage(ctx, ownerImg, W - 90, 25, 30);
  }

  // Brand
  ctx.fillStyle = "#111827";
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText("📚 Farhan MCQ", 30, 50);

  // Question number
  ctx.fillStyle = "#3b82f6";
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`প্রশ্ন নং: ${qNum}`, 30, 80);

  // Category
  ctx.fillStyle = "#6b7280";
  ctx.font = `16px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText(question.examCategoryName, W - (ownerImg ? 100 : 30), 80);
  ctx.textAlign = "left";

  // Question
  ctx.fillStyle = "#111827";
  ctx.font = `bold 26px ${FONT}`;
  const lines = wrapText(ctx, question.questionText, W - 80);
  let y = 125;
  for (const line of lines) {
    ctx.fillText(line, 35, y);
    y += 38;
  }

  // Options with colored left border
  y += 20;
  const optColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b"];
  const opts = [
    { key: "ক", text: question.optionA, letter: "A" },
    { key: "খ", text: question.optionB, letter: "B" },
    { key: "গ", text: question.optionC, letter: "C" },
    { key: "ঘ", text: question.optionD, letter: "D" },
  ];
  for (let i = 0; i < opts.length; i++) {
    const opt = opts[i];
    const isCorrect = opt.letter === question.correctAnswer;
    // Background
    ctx.fillStyle = isCorrect ? "#ecfdf5" : "#f9fafb";
    roundedRect(ctx, 35, y, W - 70, 52, 8);
    ctx.fill();
    // Left color bar
    ctx.fillStyle = optColors[i];
    ctx.fillRect(35, y + 8, 5, 36);
    // Text
    ctx.fillStyle = "#111827";
    ctx.font = `${isCorrect ? "bold " : ""}20px ${FONT}`;
    ctx.fillText(`${opt.key}) ${opt.text}`, 55, y + 34);
    if (isCorrect) {
      ctx.fillStyle = "#10b981";
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = "right";
      ctx.fillText("✓ সঠিক উত্তর", W - 50, y + 34);
      ctx.textAlign = "left";
    }
    y += 62;
  }

  // Bottom colorful blocks
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * blockW, H - 10, blockW, 10);
  }

  ctx.fillStyle = "#6b7280";
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("farhan-mcq.com | প্রতিদিন ২৪টি নতুন প্রশ্ন!", W / 2, H - 25);
  ctx.textAlign = "left";
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
