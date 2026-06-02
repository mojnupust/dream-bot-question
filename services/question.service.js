const axios = require("axios");

const MCQ_API_URL = process.env.MCQ_API_URL;

/**
 * Fetches a random question from the Farhan MCQ backend.
 * Returns null if no question is available.
 * @returns {Promise<object|null>}
 */
async function fetchRandomQuestion() {
  const url =
    MCQ_API_URL ||
    "https://api-farhan-mcq.onrender.com/api/v1/question-sets/public/random";

  const response = await axios.get(url, { timeout: 60000 });
  return response.data?.data ?? null;
}

module.exports = { fetchRandomQuestion };
