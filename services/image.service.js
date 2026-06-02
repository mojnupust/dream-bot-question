const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");
const os = require("os");

// ── Register Bengali + Latin fonts via Skia (supports complex scripts) ───
const FONTS_DIR = path.join(__dirname, "..", "fonts");
const regularFont = path.join(FONTS_DIR, "NotoSansBengali-Regular.ttf");
const boldFont = path.join(FONTS_DIR, "NotoSansBengali-Bold.ttf");
const latinRegular = path.join(FONTS_DIR, "NotoSans-Regular.ttf");
const latinBold = path.join(FONTS_DIR, "NotoSans-Bold.ttf");
const emojiFont = path.join(FONTS_DIR, "NotoColorEmoji.ttf");

// Register Latin first so Bengali falls through to it for Latin chars
if (fs.existsSync(latinRegular))
  GlobalFonts.registerFromPath(latinRegular, "NotoSans");
if (fs.existsSync(latinBold))
  GlobalFonts.registerFromPath(latinBold, "NotoSans");
if (fs.existsSync(regularFont))
  GlobalFonts.registerFromPath(regularFont, "NotoSansBengali");
if (fs.existsSync(boldFont))
  GlobalFonts.registerFromPath(boldFont, "NotoSansBengali");
if (fs.existsSync(emojiFont))
  GlobalFonts.registerFromPath(emojiFont, "NotoColorEmoji");

// Font stack: Bengali first (for বাংলা), Latin fallback (for A-Z, 0-9)
const FONT_REGULAR =
  '"NotoSansBengali", "NotoSans", "NotoColorEmoji", sans-serif';

// ── Pastel crayon-style palette ───────────────────────────────
const PASTEL_BACKGROUNDS = [
  "#FFF8E7", // warm cream
  "#F0F8FF", // alice blue
  "#FFF0F5", // lavender blush
  "#F0FFF4", // honeydew
  "#FFFACD", // lemon chiffon
  "#F5F0FF", // soft lavender
];
const OPTION_COLORS = {
  A: "#FFD6D6",
  B: "#D6F0FF",
  C: "#D6FFD9",
  D: "#FFF3D6",
};
const BRAND_COLOR = "#4F46E5";
const HEADER_BG = "#4F46E5";
const TEXT_DARK = "#1A1A2E";
const TEXT_MUTED = "#6B7280";
const BORDER_RADIUS = 18;

/**
 * Draws a rounded rectangle on a canvas context.
 */
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

/**
 * Wraps text to fit within a max width, returning array of lines.
 */
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

/**
 * Generates a pastel question card image and saves to a temp file.
 * Returns the file path.
 *
 * @param {object} question - question data from the MCQ API
 * @returns {Promise<string>} - absolute path to generated PNG
 */
async function generateQuestionCard(question, options = {}) {
  const WIDTH = options.width || 720;
  const isLarge = WIDTH >= 1000;
  const PADDING = options.padding ?? (isLarge ? 60 : 36);
  const OPTION_HEIGHT = isLarge ? 100 : 68;
  const OPTION_GAP = isLarge ? 18 : 14;
  const HEADER_H = isLarge ? 110 : 90;
  const CATEGORY_CHIP_H = isLarge ? 52 : 46;
  const CATEGORY_GAP = isLarge ? 24 : 16;
  const SECTION_LABEL_H = isLarge ? 36 : 28;
  const FOOTER_H = isLarge ? 72 : 62;

  // Pick random background
  const bgColor =
    PASTEL_BACKGROUNDS[Math.floor(Math.random() * PASTEL_BACKGROUNDS.length)];

  // --- Pre-calculate heights ---
  const tempCanvas = createCanvas(WIDTH, 100);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `bold ${isLarge ? 44 : 22}px ${FONT_REGULAR}`;
  const questionLines = wrapText(
    tempCtx,
    question.questionText,
    WIDTH - PADDING * 2 - 40,
  );
  const QUESTION_LINE_HEIGHT = isLarge ? 56 : 34;
  const questionBlockHeight = questionLines.length * QUESTION_LINE_HEIGHT + 24;
  const OPTIONS_BLOCK_H = 4 * (OPTION_HEIGHT + OPTION_GAP);

  let HEIGHT =
    HEADER_H +
    PADDING +
    CATEGORY_CHIP_H +
    CATEGORY_GAP +
    questionBlockHeight +
    PADDING +
    SECTION_LABEL_H +
    OPTIONS_BLOCK_H +
    PADDING +
    FOOTER_H +
    PADDING;
  if (options.height) HEIGHT = Math.max(HEIGHT, options.height);

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // ── Background ──────────────────────────────────────────────
  ctx.fillStyle = bgColor;
  roundedRect(ctx, 0, 0, WIDTH, HEIGHT, BORDER_RADIUS);
  ctx.fill();

  // Subtle crayon-texture dots overlay
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 400; i++) {
    ctx.beginPath();
    ctx.arc(
      Math.random() * WIDTH,
      Math.random() * HEIGHT,
      Math.random() * 3 + 1,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = "#000";
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Header Bar ───────────────────────────────────────────────
  const headerGrad = ctx.createLinearGradient(0, 0, WIDTH, HEADER_H);
  headerGrad.addColorStop(0, "#4F46E5");
  headerGrad.addColorStop(1, "#7C3AED");
  ctx.fillStyle = headerGrad;
  roundedRect(ctx, 0, 0, WIDTH, HEADER_H, BORDER_RADIUS);
  ctx.fill();
  // Fix bottom corners of header (it's not a full rounded rect at bottom)
  ctx.fillRect(0, HEADER_H - BORDER_RADIUS, WIDTH, BORDER_RADIUS);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${isLarge ? 42 : 34}px ${FONT_REGULAR}`;
  ctx.textBaseline = "middle";
  ctx.fillText("📚 Farhan MCQ", PADDING + 8, HEADER_H / 2);

  // ── Sub-Category Chip ─────────────────────────────────────────
  let curY = HEADER_H + PADDING;

  const chipText = `#${question.subExamCategoryName.replace(/\s+/g, "_")}`;
  ctx.font = `bold ${isLarge ? 22 : 19}px ${FONT_REGULAR}`;
  const chipW = ctx.measureText(chipText).width + 24;
  ctx.fillStyle = BRAND_COLOR + "18"; // 10% opacity
  roundedRect(ctx, PADDING, curY, chipW, CATEGORY_CHIP_H, 10);
  ctx.fill();
  ctx.fillStyle = BRAND_COLOR;
  ctx.textBaseline = "middle";
  ctx.fillText(chipText, PADDING + 12, curY + CATEGORY_CHIP_H / 2);

  // Exam category (right side)
  ctx.font = `bold ${isLarge ? 22 : 19}px ${FONT_REGULAR}`;
  ctx.fillStyle = TEXT_MUTED;
  ctx.textAlign = "right";
  ctx.fillText(
    question.examCategoryName,
    WIDTH - PADDING,
    curY + CATEGORY_CHIP_H / 2,
  );
  ctx.textAlign = "left";

  const contentHeight =
    CATEGORY_CHIP_H +
    CATEGORY_GAP +
    questionBlockHeight +
    PADDING +
    SECTION_LABEL_H +
    OPTIONS_BLOCK_H;
  const contentTop =
    HEADER_H +
    PADDING +
    Math.max(
      0,
      (HEIGHT - HEADER_H - FOOTER_H - PADDING * 2 - contentHeight) / 2,
    );
  curY = contentTop + CATEGORY_CHIP_H + CATEGORY_GAP;

  // ── Question Text ─────────────────────────────────────────────
  ctx.font = `bold ${isLarge ? 44 : 22}px ${FONT_REGULAR}`;
  ctx.fillStyle = TEXT_DARK;
  ctx.textBaseline = "top";

  for (const line of questionLines) {
    ctx.fillText(line, PADDING + 10, curY);
    curY += QUESTION_LINE_HEIGHT;
  }
  curY += PADDING;

  // ── Options Label ─────────────────────────────────────────────
  ctx.font = `bold ${isLarge ? 26 : 20}px ${FONT_REGULAR}`;
  ctx.fillStyle = TEXT_MUTED;
  ctx.fillText("অপশন দেখুন:", PADDING, curY);
  curY += SECTION_LABEL_H;

  // ── Options ───────────────────────────────────────────────────
  const OPTIONS = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];

  let bgFill, borderCol;

  for (const opt of OPTIONS) {
    const isCorrect = opt.key === question.correctAnswer;

    if (isCorrect) {
      const grad = ctx.createLinearGradient(
        PADDING,
        curY,
        WIDTH - PADDING,
        curY,
      );
      grad.addColorStop(0, "#D1FAE5");
      grad.addColorStop(1, "#A7F3D0");
      bgFill = grad;
      borderCol = "#10B981";
    } else {
      bgFill = OPTION_COLORS[opt.key];
      borderCol = "#E5E7EB";
    }
    ctx.fillStyle = bgFill;
    roundedRect(ctx, PADDING, curY, WIDTH - PADDING * 2, OPTION_HEIGHT, 16);
    ctx.fill();
    ctx.strokeStyle = borderCol;
    ctx.lineWidth = isCorrect ? 3 : 2;
    ctx.stroke();

    // Key circle
    const circleRadius = isLarge ? 26 : 18;
    ctx.fillStyle = isCorrect ? "#10B981" : BRAND_COLOR;
    ctx.beginPath();
    ctx.arc(
      PADDING + circleRadius,
      curY + OPTION_HEIGHT / 2,
      circleRadius,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${isLarge ? 24 : 14}px ${FONT_REGULAR}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opt.key, PADDING + circleRadius, curY + OPTION_HEIGHT / 2);
    ctx.textAlign = "left";

    // Option text
    ctx.fillStyle = TEXT_DARK;
    ctx.font = `${isLarge ? 36 : 17}px ${FONT_REGULAR}`;
    ctx.textBaseline = "middle";
    const maxOptW = WIDTH - PADDING * 2 - (circleRadius * 2 + 32);
    let optText = opt.text;
    while (ctx.measureText(optText).width > maxOptW && optText.length > 4) {
      optText = optText.slice(0, -1);
    }
    if (optText !== opt.text) optText += "…";
    ctx.fillText(
      optText,
      PADDING + circleRadius * 2 + 24,
      curY + OPTION_HEIGHT / 2,
    );

    if (isCorrect) {
      ctx.font = `bold ${isLarge ? 20 : 13}px ${FONT_REGULAR}`;
      ctx.fillStyle = "#10B981";
      ctx.textAlign = "right";
      ctx.fillText(
        "✅ সঠিক উত্তর",
        WIDTH - PADDING - 8,
        curY + OPTION_HEIGHT / 2,
      );
      ctx.textAlign = "left";
    }

    curY += OPTION_HEIGHT + OPTION_GAP;
  }

  // ── Footer ────────────────────────────────────────────────────
  curY += PADDING / 2;
  ctx.strokeStyle = "#E5E7EB";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, curY);
  ctx.lineTo(WIDTH - PADDING, curY);
  ctx.stroke();
  curY += 12;

  ctx.font = `bold ${isLarge ? 20 : 17}px ${FONT_REGULAR}`;
  ctx.fillStyle = TEXT_MUTED;
  ctx.textBaseline = "top";
  ctx.fillStyle = BRAND_COLOR;
  ctx.fillText("🌐 farhan-mcq.com", PADDING, curY);
  ctx.textAlign = "right";
  ctx.fillText("🔔 প্রতি ২ ঘণ্টায় নতুন প্রশ্ন!", WIDTH - PADDING, curY);
  ctx.textAlign = "left";

  // ── Save to temp file ─────────────────────────────────────────
  const tmpPath = path.join(
    os.tmpdir(),
    `farhan-mcq-question-${Date.now()}.png`,
  );
  const buffer = await canvas.encode("png");
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}

/**
 * Cleans up a temporary image file after posting.
 */
function cleanupImage(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_) {
    // ignore
  }
}

module.exports = { generateQuestionCard, cleanupImage };
