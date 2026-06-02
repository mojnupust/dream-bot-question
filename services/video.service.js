const fs = require("fs");
const path = require("path");
const { GlobalFonts } = require("@napi-rs/canvas");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { fetchRandomQuestion } = require("./question.service");
const { postVideoToFacebookPage } = require("./facebook.service");
const { generateQuestionCard } = require("./image.service");

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

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Returns a random local music file path from the provided music directory.
 * @returns {Promise<string|null>} path to music file or null when none available
 */
async function getRandomMusicPath() {
  const musicDir = path.join(__dirname, "../music");
  if (!fs.existsSync(musicDir)) return null;

  const musicFiles = fs
    .readdirSync(musicDir)
    .filter((file) => /\.(mp3|wav|m4a|aac|ogg)$/i.test(file));

  if (musicFiles.length === 0) return null;

  const randomFile = musicFiles[Math.floor(Math.random() * musicFiles.length)];
  return path.join(musicDir, randomFile);
}

/**
 * Creates a video from images and music.
 * @param {string[]} imagePaths
 * @param {string} musicPath
 * @returns {Promise<string>} path to video file
 */
async function createVideo(imagePaths, musicPath) {
  const videoPath = path.join(__dirname, "../temp/video.mp4");
  const listPath = path.join(__dirname, "../temp/video_images.txt");

  const listContent =
    imagePaths
      .map(
        (imagePath) => `file '${imagePath.replace(/'/g, "'\\''")}'\nduration 8`,
      )
      .join("\n") +
    `\nfile '${imagePaths[imagePaths.length - 1].replace(/'/g, "'\\''")}'\n`;

  fs.writeFileSync(listPath, listContent, "utf8");

  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(listPath)
      .inputOptions(["-f", "concat", "-safe", "0"]);

    if (musicPath) {
      command.input(musicPath).audioCodec("aac").audioFilters("volume=0.6"); // 🔉 30% volume — adjust as needed
    }

    command
      .videoCodec("libx264")
      .outputOptions([
        "-pix_fmt yuv420p",
        "-r 30",
        "-movflags +faststart",
        ...(musicPath ? ["-shortest"] : []),
      ])
      .output(videoPath)
      .on("end", () => {
        try {
          fs.unlinkSync(listPath);
        } catch (_) {}
        resolve(videoPath);
      })
      .on("error", (err) => {
        try {
          fs.unlinkSync(listPath);
        } catch (_) {}
        reject(err);
      })
      .run();
  });
}

/**
 * Generates and posts a video with 4 random questions.
 * @returns {Promise<{videoPath: string, caption: string}>}
 */
async function generateStyledQuestionVideo() {
  // Ensure temp directory
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  // Fetch 4 random questions
  const questions = [];
  for (let i = 0; i < 6; i++) {
    const question = await fetchRandomQuestion();
    if (question) questions.push(question);
  }
  if (questions.length < 6) throw new Error("Not enough questions available");

  // Generate portrait images using styled question cards
  const imagePaths = [];
  for (let i = 0; i < questions.length; i++) {
    const imagePath = await generateQuestionCard(questions[i], {
      width: 1080,
      height: 1920,
    });
    imagePaths.push(imagePath);
  }

  return await buildVideoFromImages(imagePaths);
}

async function buildVideoFromImages(imagePaths) {
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  let musicPath = null;
  try {
    musicPath = await getRandomMusicPath();
    if (!musicPath) {
      console.warn(
        "⚠️ No local music file found, creating video without audio.",
      );
    }
  } catch (err) {
    console.warn(
      "⚠️ Failed to select local music file, creating video without audio:",
      err.message,
    );
  }

  const videoPath = await createVideo(imagePaths, musicPath);
  const caption = "৪টি #Random প্রশ্ন! প্র্যাকটিস করুন। #FarhanMCQ #MCQ";

  imagePaths.forEach((file) => {
    try {
      fs.unlinkSync(file);
    } catch (_) {}
  });

  return { videoPath, caption };
}

async function generateAndPostVideo() {
  const { videoPath, caption } = await generateStyledQuestionVideo();
  const postId = await postVideoToFacebookPage(videoPath, caption);
  return { videoPath, caption, postId };
}

/**
 * Generates a video and saves it to the videos folder with a unique filename.
 * No external API calls, just saves the video locally.
 * Videos in the videos folder are NEVER auto-deleted.
 * @returns {Promise<{videoPath: string, caption: string, savedPath: string}>}
 */
async function generateAndSaveVideo() {
  const { videoPath, caption } = await generateStyledQuestionVideo();

  // Ensure videos directory exists
  const videosDir = path.join(__dirname, "../videos");
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  // Create unique filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const savedPath = path.join(videosDir, `video-${timestamp}.mp4`);

  // Copy video to videos folder (PERMANENT storage)
  fs.copyFileSync(videoPath, savedPath);
  console.log(`✅ Video saved to ${savedPath}`);

  // Clean up ONLY the temp video, NOT the saved video
  try {
    fs.unlinkSync(videoPath);
  } catch (_) {}

  return { videoPath: savedPath, caption, savedPath };
}

module.exports = {
  generateAndPostVideo,
  generateStyledQuestionVideo,
  generateAndSaveVideo,
};
