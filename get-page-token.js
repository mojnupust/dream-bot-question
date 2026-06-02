/**
 * Run this once to get your Page Access Token from your User Token.
 * Usage: node get-page-token.js
 */
require("dotenv").config();
const axios = require("axios");

const USER_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;

if (!USER_TOKEN || !PAGE_ID) {
  console.error("❌ Set FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID in .env first.");
  process.exit(1);
}

async function main() {
  console.log("🔍 Fetching pages your User Token has access to...\n");

  const res = await axios.get("https://graph.facebook.com/v19.0/me/accounts", {
    params: { access_token: USER_TOKEN },
  });

  const pages = res.data.data;
  if (!pages || pages.length === 0) {
    console.error(
      "❌ No pages found. Make sure your token has pages_show_list permission.",
    );
    return;
  }

  console.log("📄 Pages found:");
  for (const page of pages) {
    console.log(`\n  Name:     ${page.name}`);
    console.log(`  ID:       ${page.id}`);
    console.log(`  Token:    ${page.access_token}`);

    if (page.id === PAGE_ID) {
      console.log(
        `\n✅ THIS IS YOUR PAGE TOKEN — copy this into .env as FB_PAGE_ACCESS_TOKEN:\n`,
      );
      console.log(page.access_token);
    }
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.response?.data || err.message);
});
