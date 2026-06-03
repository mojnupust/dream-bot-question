const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { getPageToken } = require("./fb-token.service");

const FB_API_VERSION = "v19.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;

/**
 * Builds plain-text post body for Facebook (no markdown).
 * Used as a fallback when AI caption is not provided.
 */
function buildFacebookText(question) {
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

  return [
    `আজকের প্রশ্ন — ${question.examCategoryName} পরীক্ষার জন্য!`,
    ``,
    `${question.questionText}`,
    ``,
    `(ক) ${question.optionA}`,
    `(খ) ${question.optionB}`,
    `(গ) ${question.optionC}`,
    `(ঘ) ${question.optionD}`,
    ``,
    `সঠিক উত্তর: (${correctLetter}) ${correctText}`,
    ``,
    `প্র্যাকটিস করতে থাকো, সাফল্য আসবেই!`,
    ``,
    `${tag} ${examTag} #FarhanMCQ #MCQ #BCS_প্রস্তুতি`,
    ``,
    ``,
  ].join("\n");
}

/**
 * Posts a photo with caption to a Facebook Page.
 * Uses the /photos endpoint which creates a photo post in one step.
 *
 * @param {string} imagePath - absolute path to the PNG file
 * @param {object} question - question data
 * @param {string} [aiCaption] - optional AI-generated caption
 * @returns {Promise<string>} - post ID
 */
async function postToFacebookPage(imagePath, question, aiCaption) {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = getPageToken();

  if (!pageId || !accessToken) {
    throw new Error("Facebook not configured or token not initialised.");
  }

  const caption = aiCaption || buildFacebookText(question);

  const form = new FormData();
  form.append("source", fs.createReadStream(imagePath), {
    filename: "question.png",
    contentType: "image/png",
  });
  form.append("caption", caption);
  form.append("access_token", accessToken);

  const response = await axios
    .post(`${FB_BASE}/${pageId}/photos`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    })
    .catch((err) => {
      const fb = err.response?.data;
      throw new Error(fb ? JSON.stringify(fb) : err.message);
    });

  return response.data.post_id || response.data.id;
}

/**
 * Posts a plain-text (no image) post to a Facebook Page.
 * Used for motivational and study-tip posts.
 *
 * @param {string} message - post text
 * @returns {Promise<string>} - post ID
 */
async function postTextToFacebookPage(message) {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = getPageToken();

  if (!pageId || !accessToken) {
    throw new Error("Facebook not configured or token not initialised.");
  }

  // const response = await axios
  //   .post(
  //     `${FB_BASE}/${pageId}/feed`,
  //     {
  //       message,
  //       access_token: accessToken,
  //     },
  //     { timeout: 30000 },
  //   )
  //   .catch((err) => {
  //     const fb = err.response?.data;
  //     throw new Error(fb ? JSON.stringify(fb) : err.message);
  //   });

  // return response.data.id;

  console.log("Facebook Question Image Post off for now");
}
async function postVideoToFacebookPage(videoPath, caption) {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = getPageToken();

  if (!pageId || !accessToken) {
    throw new Error("Facebook not configured or token not initialised.");
  }

  const form = new FormData();
  form.append("source", fs.createReadStream(videoPath), {
    filename: "video.mp4",
    contentType: "video/mp4",
  });
  form.append("description", caption);
  form.append("access_token", accessToken);

  // const response = await axios
  //   .post(`${FB_BASE}/${pageId}/videos`, form, {
  //     headers: form.getHeaders(),
  //     timeout: 60000, // Longer timeout for video upload
  //   })
  //   .catch((err) => {
  //     const fb = err.response?.data;
  //     throw new Error(fb ? JSON.stringify(fb) : err.message);
  //   });

  // return response.data.id;

  console.log("Facebook Video post off for now");
}

module.exports = {
  postToFacebookPage,
  postTextToFacebookPage,
  postVideoToFacebookPage,
  buildFacebookText,
};
