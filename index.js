require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const { fetchRandomQuestion } = require("./services/question.service");
const {
  generateQuestionCard,
  cleanupImage,
} = require("./services/image.service");
const {
  postQuestionToTelegram,
  postTextToTelegram,
  postVideoToTelegram,
} = require("./services/telegram.service");
// const {
//   postToFacebookPage,
//   postTextToFacebookPage,
// } = require("./services/facebook.service");
const {
  pickPostType,
  generateCreativePost,
  generateQuestionCaption,
} = require("./services/ai.service");
const {
  generateAndPostVideo,
  generateAndSaveVideo,
  generateStyledQuestionVideo,
} = require("./services/video.service");
const { initFBToken, refreshFBToken } = require("./services/fb-token.service");
const {
  generate24Slides,
  readCounter,
  IMAGES_DIR,
} = require("./services/slide-generator.service");

const app = express();

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const groupId = process.env.GROUP_CHAT_ID;
const SERVER_URL =
  process.env.SERVER_URL || "https://api-farhan-mcq.onrender.com/api/health";

// TEST_MODE=true → run every 5 minutes; production → every hour
const TEST_MODE = process.env.TEST_MODE === "true";
const CRON_SCHEDULE = TEST_MODE ? "*/5 * * * *" : "0 * * * *";

console.log(
  `🤖 Bot starting in ${TEST_MODE ? "TEST (5 min)" : "PRODUCTION (1 hr)"} mode`,
);

const bot = new TelegramBot(token, { polling: false });

// ── Home route (uptime robot) ──────────────────────────────────
app.get("/", (req, res) => {
  res.send("Bot is running");
});

// ── API route: view counter status ─────────────────────────────
app.get("/api/counter", (req, res) => {
  const counter = readCounter();
  res.json(counter);
});

// ── API route: view generated images ───────────────────────────
app.get("/api/images", (req, res) => {
  try {
    const files = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith(".png"));
    res.json({ total: files.length, images: files });
  } catch {
    res.json({ total: 0, images: [] });
  }
});

// ── Generate 24 slides and send first one to Telegram ──────────
async function generateSlidesAndPost() {
  console.log("\n🎨 ═══════════════════════════════════════════════════");
  console.log("   FARHAN MCQ — 24 Image Slide Generator");
  console.log("═══════════════════════════════════════════════════════\n");

  try {
    // Generate 24 slides with different styles, saved permanently
    const { slides, startNum, endNum } = await generate24Slides(
      fetchRandomQuestion,
    );

    if (slides.length === 0) {
      console.error("❌ No slides generated! Check API connection.");
      return;
    }

    // Send the FIRST slide to Telegram group automatically
    console.log("📤 Sending first slide to Telegram...");
    const firstSlide = slides[0];

    const telegramTargets = [
      ...(chatId ? [{ id: chatId, label: "bot chat" }] : []),
      ...(groupId ? [{ id: groupId, label: "group" }] : []),
    ];

    for (const target of telegramTargets) {
      try {
        const caption = [
          `📚 <b>Farhan MCQ — প্রশ্ন #${firstSlide.questionNumber}</b>`,
          ``,
          `<b>${firstSlide.question.questionText}</b>`,
          ``,
          `(ক) ${firstSlide.question.optionA}`,
          `(খ) ${firstSlide.question.optionB}`,
          `(গ) ${firstSlide.question.optionC}`,
          `(ঘ) ${firstSlide.question.optionD}`,
          ``,
          `✅ সঠিক উত্তর: <b>(${firstSlide.question.correctAnswer === "A" ? "ক" : firstSlide.question.correctAnswer === "B" ? "খ" : firstSlide.question.correctAnswer === "C" ? "গ" : "ঘ"}) ${firstSlide.question["option" + firstSlide.question.correctAnswer]}</b>`,
          ``,
          `#${firstSlide.question.subExamCategoryName.replace(/\s+/g, "_")} #${firstSlide.question.examCategoryName.replace(/\s+/g, "_")}`,
          `🌐 farhan-mcq.com`,
        ].join("\n");

        const photoStream = fs.createReadStream(firstSlide.path);
        await bot.sendPhoto(target.id, photoStream, {
          caption,
          parse_mode: "HTML",
        });
        console.log(`  ✅ Slide sent to Telegram ${target.label}`);
      } catch (err) {
        console.error(`  ❌ Telegram ${target.label}: ${err.message}`);
      }
    }

    console.log("\n📋 Summary:");
    console.log(`   • ${slides.length} slides generated and saved permanently`);
    console.log(`   • Question range: #${startNum} to #${endNum}`);
    console.log(`   • Saved to: ${IMAGES_DIR}`);
    console.log(`   • First slide sent to Telegram`);
    console.log(`   • Upload remaining 23 slides to Facebook/Instagram manually`);
    console.log("\n═══════════════════════════════════════════════════════\n");
  } catch (err) {
    console.error(`❌ Slide generation failed: ${err.message}`);
  }
}

// ── Run all tasks and exit ─────────────────────────────────────
async function runAllPostTypesAndExit() {
  console.log("\n🚀 Starting execution...\n");

  try {
    // 1. GENERATE 24 IMAGE SLIDES (Main feature)
    console.log("🎨 [1/3] Generating 24 Image Slides...");
    await generateSlidesAndPost();

    // 2. MOTIVATIONAL POST (Save to file)
    console.log("💪 [2/3] Generating Motivational Post...");
    try {
      const motivationalText = await generateCreativePost("motivational");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `motivational-${timestamp}.txt`;
      const filePath = path.join(__dirname, "Motivational", fileName);

      fs.writeFileSync(filePath, motivationalText, "utf-8");
      console.log(`✅ Motivational post saved to ${filePath}\n`);
    } catch (err) {
      console.error(`❌ Motivational post failed: ${err.message}\n`);
    }

    // 3. STUDY TIP POST (Save to file)
    console.log("📚 [3/3] Generating Study Tip Post...");
    try {
      const studyTipText = await generateCreativePost("study-tip");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `study-tip-${timestamp}.txt`;
      const filePath = path.join(__dirname, "Study Tips", fileName);

      fs.writeFileSync(filePath, studyTipText, "utf-8");
      console.log(`✅ Study tip post saved to ${filePath}\n`);
    } catch (err) {
      console.error(`❌ Study tip post failed: ${err.message}\n`);
    }

    console.log("✨ All tasks completed successfully!");
    console.log("👋 Exiting server...\n");
    process.exit(0);
  } catch (err) {
    console.error(`❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
}

// ── Self-ping to prevent Render cold start ────────────────────
// (Disabled - running single execution mode)
// cron.schedule("*/6 * * * *", () => {
//   const https = require("https");
//   const http = require("http");
//   const lib = SERVER_URL.startsWith("https") ? https : http;

//   lib
//     .get(SERVER_URL, (res) => {
//       console.log(`✅ Self-ping OK — HTTP ${res.statusCode}`);
//     })
//     .on("error", (err) => {
//       console.error(`❌ Self-ping failed: ${err.message}`);
//     });
// });

// ── Weekly FB token refresh (every Monday at 03:00) ──────────
// (Disabled - running single execution mode)
// cron.schedule("0 3 * * 1", async () => {
//   console.log("🔄 Weekly FB token refresh...");
//   await refreshFBToken();
// });

// ── Server ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// Init Facebook token, then run all tasks and exit
initFBToken().then(() => {
  runAllPostTypesAndExit();
});
