const { GoogleGenerativeAI } = require("@google/generative-ai");
const { motivationalPosts, studyTips } = require("./fallback-posts");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model fallback chain: lite → flash (if one quota exhausted, try next)
const MODELS = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash-8b",
  "gemini-flash-latest",
];

/**
 * Try each model in order until one succeeds.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function generateWithFallback(prompt) {
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      if (text) return text;
    } catch (err) {
      const is429 =
        err.message?.includes("429") || err.message?.includes("quota");
      const is404 =
        err.message?.includes("404") || err.message?.includes("not found");
      if (is429 || is404) {
        console.warn(
          `⚠️ Model ${modelName} unavailable (${is429 ? "quota" : "not found"}), trying next...`,
        );
        continue;
      }
      throw err; // unexpected error — propagate
    }
  }
  throw new Error("All Gemini models exhausted or quota exceeded.");
}

// Post type weights: question 55%, motivational 25%, study-tip 20%
const POST_TYPES = [
  ...Array(55).fill("question"),
  ...Array(25).fill("motivational"),
  ...Array(20).fill("study-tip"),
];

function pickPostType() {
  const now = new Date();
  const hour = now.getHours(); // 0-23

  // Specific schedule:
  // 6 AM: study-tip
  if (hour === 6) return "study-tip";

  // 7,8,9 AM + 11,12,1 PM + 3,4,5 PM + 7,8,9 PM: video (12 videos total)
  if ([7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 21].includes(hour))
    return "video";

  // 10 AM, 2 PM, 6 PM, 10 PM: question
  if ([10, 14, 18, 22].includes(hour)) return "question";

  // 11 PM: motivational
  if (hour === 23) return "motivational";

  // No post for other hours
  return null;
}

/**
 * Builds a clean hashtag from a string.
 * Spaces → underscores, removes special chars.
 */
function makeHashtag(text) {
  return (
    "#" +
    text
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\u0980-\u09FF_]/g, "")
  );
}

/**
 * Generate a motivational or study-tip post using Gemini.
 * Returns a plain-text string ready to post.
 */
async function generateCreativePost(type) {
  if (!process.env.GEMINI_API_KEY) {
    return getFallbackPost(type);
  }

  const prompts = {
    motivational: `তুমি একজন বাংলাদেশি প্রতিযোগিতামূলক পরীক্ষার্থীদের জন্য Facebook পেজ পরিচালনা করছো।
একটি অনুপ্রেরণামূলক পোস্ট লিখো (বাংলায়) যেটা:
- ২-৪ লাইনের ছোট, আন্তরিক এবং মানবিক
- BCS, NTRCA, Primary, Bank পরীক্ষার্থীদের জন্য প্রাসঙ্গিক
- রোবোটিক না, যেন একজন সিনিয়র বন্ধু লিখেছে
- শেষে ২-৩টি প্রাসঙ্গিক বাংলা/ইংরেজি হ্যাশট্যাগ যোগ করো
- কোনো markdown বা asterisk (*) ব্যবহার করবে না

শুধু পোস্টের টেক্সট দাও, অন্য কিছু না।`,

    "study-tip": `তুমি একজন বাংলাদেশি প্রতিযোগিতামূলক পরীক্ষার্থীদের জন্য Facebook পেজ পরিচালনা করছো।
একটি ছোট এবং কার্যকর পড়াশোনার টিপস পোস্ট লিখো (বাংলায়) যেটা:
- ১টি নির্দিষ্ট, বাস্তব টিপস দেবে (BCS/NTRCA/Primary প্রস্তুতির জন্য)
- ৩-৫ লাইনের মধ্যে, সহজ ভাষায়
- যেন একজন অভিজ্ঞ পরীক্ষার্থী তার বন্ধুকে বলছে
- শেষে ২-৩টি প্রাসঙ্গিক হ্যাশট্যাগ
- কোনো markdown বা asterisk (*) ব্যবহার করবে না

শুধু পোস্টের টেক্সট দাও, অন্য কিছু না।`,
  };

  try {
    const text = await generateWithFallback(prompts[type]);
    return text;
  } catch (err) {
    console.error(`⚠️ Gemini failed for ${type}: ${err.message}`);
    return getFallbackPost(type);
  }
}

/**
 * Generate a human-like caption for a question post.
 * Returns enriched plain-text caption.
 */
async function generateQuestionCaption(question) {
  if (!process.env.GEMINI_API_KEY) {
    return buildFallbackQuestionCaption(question);
  }

  const correctLetter =
    { A: "ক", B: "খ", C: "গ", D: "ঘ" }[question.correctAnswer] ||
    question.correctAnswer;
  const correctText = question[`option${question.correctAnswer}`];

  const prompt = `তুমি একজন বাংলাদেশের প্রতিযোগিতামূলক পরীক্ষার্থীদের পেজ পরিচালনা করছো।

নিচের প্রশ্নটির জন্য একটি আকর্ষণীয় Facebook পোস্ট লিখো:

প্রশ্ন: ${question.questionText}
বিষয়: ${question.examCategoryName} - ${question.subExamCategoryName}
বিকল্প:
(ক) ${question.optionA}
(খ) ${question.optionB}
(গ) ${question.optionC}
(ঘ) ${question.optionD}
সঠিক উত্তর: (${correctLetter}) ${correctText}

নির্দেশনা:
- শুরুতে একটি ছোট আকর্ষণীয় লাইন লিখো (প্রশ্নটি কেন গুরুত্বপূর্ণ বা মজার)
- তারপর প্রশ্নটি এবং সব বিকল্প দাও (ক/খ/গ/ঘ ফরম্যাটে)
- সঠিক উত্তর দাও
- শেষে একটি ছোট উৎসাহমূলক লাইন
- প্রাসঙ্গিক ৩-৪টি হ্যাশট্যাগ (#${question.examCategoryName.replace(/\s+/g, "_")} #MCQ #BCS_Preparation #FarhanMCQ)
- কোনো markdown বা asterisk (*) ব্যবহার করবে না
- মানবিক ও আন্তরিক টোন রাখো

শুধু পোস্টের টেক্সট দাও।`;

  try {
    const text = await generateWithFallback(prompt);
    return text;
  } catch (err) {
    console.error(`⚠️ Gemini question caption failed: ${err.message}`);
    return buildFallbackQuestionCaption(question);
  }
}

/** Fallback motivational/tip posts when Gemini is unavailable */
function getFallbackPost(type) {
  const pool = type === "motivational" ? motivationalPosts : studyTips;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Fallback plain-text question caption */
function buildFallbackQuestionCaption(question) {
  const subTag = makeHashtag(question.subExamCategoryName);
  const examTag = makeHashtag(question.examCategoryName);
  const correctLetter =
    { A: "ক", B: "খ", C: "গ", D: "ঘ" }[question.correctAnswer] ||
    question.correctAnswer;
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
    `প্র্যাকটিস করতে থাকো — সাফল্য আসবেই!`,
    ``,
    `${subTag} ${examTag} #MCQ #FarhanMCQ #BCS_প্রস্তুতি`,
    ``,
    ``,
  ].join("\n");
}

module.exports = {
  pickPostType,
  generateCreativePost,
  generateQuestionCaption,
  makeHashtag,
};
