const fs = require("fs");

/** Escapes HTML special chars for Telegram HTML parse mode. */
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Builds the post caption (HTML) for a question.
 * Used as fallback when no AI caption is provided.
 */
function buildCaption(question) {
  const tag = `#${question.subExamCategoryName.replace(/\s+/g, "_")}`;
  const examTag = `#${question.examCategoryName.replace(/\s+/g, "_")}`;

  const correctLetter =
    question.correctAnswer === "A"
      ? "ক"
      : question.correctAnswer === "B"
        ? "খ"
        : question.correctAnswer === "C"
          ? "গ"
          : "ঘ";
  const correctText = question[`option${question.correctAnswer}`];

  const options = [
    `(ক) ${esc(question.optionA)}`,
    `(খ) ${esc(question.optionB)}`,
    `(গ) ${esc(question.optionC)}`,
    `(ঘ) ${esc(question.optionD)}`,
  ].join("\n");

  return [
    `আজকের প্রশ্ন — <b>${esc(question.examCategoryName)}</b>`,
    `${tag} ${examTag}`,
    ``,
    `<b>${esc(question.questionText)}</b>`,
    ``,
    options,
    ``,
    `সঠিক উত্তর: <b>(${correctLetter}) ${esc(correctText)}</b>`,
    ``,
    `প্র্যাকটিস করতে থাকো!`,
    ``,
  ].join("\n");
}

/**
 * Posts a question (photo + caption) to a Telegram chat.
 *
 * @param {import('node-telegram-bot-api')} bot
 * @param {string} chatId - Telegram chat/group ID
 * @param {object} question - question data
 * @param {string} imagePath - path to the generated PNG
 * @param {string} [aiCaption] - optional plain-text AI caption (sent as plain text)
 */
async function postQuestionToTelegram(
  bot,
  chatId,
  question,
  imagePath,
  aiCaption,
) {
  const photoStream = fs.createReadStream(imagePath);

  if (aiCaption) {
    // AI caption is plain text, not HTML
    await bot.sendPhoto(chatId, photoStream, {
      caption: aiCaption,
      parse_mode: "HTML",
    });
  } else {
    const caption = buildCaption(question);
    await bot.sendPhoto(chatId, photoStream, {
      caption,
      parse_mode: "HTML",
    });
  }
}

/**
 * Posts a video with caption to a Telegram chat.
 *
 * @param {import('node-telegram-bot-api')} bot
 * @param {string} chatId - Telegram chat/group ID
 * @param {string} videoPath - path to the generated MP4
 * @param {string} caption - caption for the video
 */
async function postVideoToTelegram(bot, chatId, videoPath, caption) {
  const videoStream = fs.createReadStream(videoPath);
  await bot.sendVideo(chatId, videoStream, {
    caption,
    parse_mode: "HTML",
  });
}

/**
 * Posts plain text to a Telegram chat.
 *
 * @param {import('node-telegram-bot-api')} bot
 * @param {string} chatId - Telegram chat/group ID
 * @param {string} text - message text
 */
async function postTextToTelegram(bot, chatId, text) {
  await bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
  });
}

module.exports = {
  postQuestionToTelegram,
  postTextToTelegram,
  postVideoToTelegram,
  buildCaption,
};
