/**
 * Facebook Page Access Token Auto-Refresh Service
 *
 * Flow:
 *  1. On startup: exchange FB_USER_TOKEN for a long-lived user token (60 days).
 *  2. Use the long-lived user token to fetch the Page Access Token
 *     → Page tokens derived from long-lived user tokens NEVER expire.
 *  3. Persist the long-lived user token to disk so it survives restarts.
 *  4. Refresh weekly (cron) — well inside the 60-day window.
 *
 * Required env vars:
 *   FB_APP_ID          – your Facebook App ID
 *   FB_APP_SECRET      – your Facebook App Secret
 *   FB_USER_TOKEN      – a short- or long-lived user access token (one-time setup)
 *   FB_PAGE_ID         – your Facebook Page numeric ID
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const FB_API_VERSION = "v19.0";
const FB_BASE = `https://graph.facebook.com/${FB_API_VERSION}`;
const TOKEN_CACHE_FILE = path.join(__dirname, "..", ".fb-token-cache.json");

// In-memory page access token
let _pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || null;

/**
 * Returns the cached page access token.
 * Call initFBToken() at startup first.
 */
function getPageToken() {
  return _pageAccessToken;
}

/**
 * Persists the long-lived user token to disk so it survives restarts.
 */
function saveCachedUserToken(longLivedUserToken) {
  try {
    fs.writeFileSync(
      TOKEN_CACHE_FILE,
      JSON.stringify({ longLivedUserToken, savedAt: Date.now() }),
      "utf8",
    );
  } catch (err) {
    console.warn(`⚠️ Could not save FB token cache: ${err.message}`);
  }
}

/**
 * Loads the previously saved long-lived user token from disk.
 * Returns null if not found or if it is older than 55 days (refresh margin).
 */
function loadCachedUserToken() {
  try {
    if (!fs.existsSync(TOKEN_CACHE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, "utf8"));
    const ageDays = (Date.now() - data.savedAt) / (1000 * 60 * 60 * 24);
    if (ageDays > 55) {
      console.log("⚠️ Cached FB user token is >55 days old, will re-exchange.");
      return null;
    }
    return data.longLivedUserToken || null;
  } catch {
    return null;
  }
}

/**
 * Exchanges a user access token for a long-lived user token (60-day).
 *
 * @param {string} userToken - short- or long-lived user access token
 * @returns {Promise<string>} long-lived user access token
 */
async function exchangeForLongLivedToken(userToken) {
  const { data } = await axios.get(`${FB_BASE}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      fb_exchange_token: userToken,
    },
    timeout: 15000,
  });

  if (!data.access_token) {
    throw new Error(`No access_token in response: ${JSON.stringify(data)}`);
  }

  const expiresInDays = Math.round((data.expires_in || 0) / 86400);
  console.log(
    `✅ Exchanged FB user token → long-lived token (expires in ~${expiresInDays} days)`,
  );
  return data.access_token;
}

/**
 * Gets the Page Access Token for FB_PAGE_ID using the given long-lived user token.
 * A page token obtained this way is PERMANENT (never expires).
 *
 * @param {string} longLivedUserToken
 * @returns {Promise<string>} permanent page access token
 */
async function fetchPageToken(longLivedUserToken) {
  const pageId = process.env.FB_PAGE_ID;
  const { data } = await axios.get(`${FB_BASE}/${pageId}`, {
    params: {
      fields: "access_token",
      access_token: longLivedUserToken,
    },
    timeout: 15000,
  });

  if (!data.access_token) {
    throw new Error(
      `No page access_token in response: ${JSON.stringify(data)}`,
    );
  }

  console.log("✅ Got permanent FB Page access token");
  return data.access_token;
}

/**
 * Main init: exchange tokens and cache the permanent page token.
 * Call once at startup.
 */
async function initFBToken() {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const userToken = process.env.FB_USER_TOKEN;

  // If app credentials are not configured, fall back to static token from env
  if (!appId || !appSecret) {
    console.log(
      "⚠️ FB_APP_ID / FB_APP_SECRET not set — using static FB_PAGE_ACCESS_TOKEN (may expire).",
    );
    _pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || null;
    return;
  }

  if (!userToken && !loadCachedUserToken()) {
    console.log(
      "⚠️ FB_USER_TOKEN not set and no cached token found — Facebook posting disabled.",
    );
    _pageAccessToken = null;
    return;
  }

  try {
    // Try to reuse a recently cached long-lived token (avoids consuming exchange quota)
    let longLivedToken = loadCachedUserToken();

    if (!longLivedToken) {
      if (!userToken) {
        throw new Error("FB_USER_TOKEN required for initial exchange.");
      }
      longLivedToken = await exchangeForLongLivedToken(userToken);
      saveCachedUserToken(longLivedToken);
    } else {
      console.log("♻️  Using cached long-lived FB user token.");
    }

    _pageAccessToken = await fetchPageToken(longLivedToken);
  } catch (err) {
    console.error(`❌ FB token init failed: ${err.message}`);
    // Fallback to static token if init fails
    _pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN || null;
    if (_pageAccessToken) {
      console.log("⚠️ Falling back to static FB_PAGE_ACCESS_TOKEN.");
    }
  }
}

/**
 * Refresh: re-exchange and get a fresh page token.
 * Call from a weekly cron job.
 */
async function refreshFBToken() {
  const appId = process.env.FB_APP_ID;
  const appSecret = process.env.FB_APP_SECRET;
  const userToken = process.env.FB_USER_TOKEN;

  if (!appId || !appSecret) return;

  try {
    const cachedToken = loadCachedUserToken();
    // Prefer cached long-lived token for exchange (it extends it further)
    const tokenToExchange = cachedToken || userToken;

    if (!tokenToExchange) {
      console.warn("⚠️ FB token refresh: no user token available.");
      return;
    }

    const longLivedToken = await exchangeForLongLivedToken(tokenToExchange);
    saveCachedUserToken(longLivedToken);
    _pageAccessToken = await fetchPageToken(longLivedToken);
    console.log("✅ FB token refreshed successfully.");
  } catch (err) {
    console.error(`❌ FB token refresh failed: ${err.message}`);
  }
}

module.exports = { initFBToken, refreshFBToken, getPageToken };
