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

// ── AI-driven post execution ───────────────────────────────────
// (Replaced with runAllPostTypesAndExit for single-run mode)

// ── Run all three post types sequentially and exit ─────────────
async function runAllPostTypesAndExit() {
  console.log("\n🚀 Starting execution of all three post types...\n");

  try {
    // 1. QUESTION POST (Image to Telegram)
    console.log("📸 [1/3] Generating Question Post (Image)...");
    const postType1 = "question";
    let imagePath = null;
    try {
      const question = await fetchRandomQuestion();
      if (question) {
        const [imagePth, aiCaption] = await Promise.all([
          generateQuestionCard(question),
          generateQuestionCaption(question),
        ]);
        imagePath = imagePth;

        const telegramTargets = [
          ...(chatId ? [{ id: chatId, label: "bot chat" }] : []),
          ...(groupId ? [{ id: groupId, label: "group" }] : []),
        ];

        for (const target of telegramTargets) {
          try {
            await postQuestionToTelegram(
              bot,
              target.id,
              question,
              imagePath,
              aiCaption,
            );
            console.log(`✅ Question posted to Telegram ${target.label}\n`);
          } catch (err) {
            console.error(`❌ Telegram ${target.label}: ${err.message}\n`);
          }
        }
      }
    } catch (err) {
      console.error(`❌ Question post failed: ${err.message}\n`);
    } finally {
      if (imagePath) cleanupImage(imagePath);
    }

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

    console.log("✨ All three tasks completed successfully!");
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

// Init Facebook token, then run all three post types and exit
initFBToken().then(() => {
  runAllPostTypesAndExit();
});
