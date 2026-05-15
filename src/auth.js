require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

// The path where we will permanently store the login tokens
const TOKEN_PATH = path.join(__dirname, '../data/credentials.json');

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Listen for automatic token refreshes from Google and save them
oauth2Client.on('tokens', async (tokens) => {
  try {
    let currentTokens = {};
    try {
      const data = await fs.readFile(TOKEN_PATH, 'utf8');
      currentTokens = JSON.parse(data);
    } catch (err) { /* File doesn't exist yet */ }

    // Merge new tokens with old ones (Google sometimes doesn't send a new refresh token, so we must keep the old one)
    const tokensToSave = { ...currentTokens, ...tokens };
    await fs.writeFile(TOKEN_PATH, JSON.stringify(tokensToSave), 'utf8');
    console.log('🔄 Google Tokens automatically refreshed and saved.');
  } catch (err) {
    console.error('Failed to save refreshed tokens:', err);
  }
});

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', 
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
}

async function getTokens(code) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  
  // Save the initial tokens to disk right after logging in
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens), 'utf8');
  
  return tokens;
}

/**
 * Loads the saved tokens from the hard drive when the server starts.
 */
async function loadSavedTokens() {
  try {
    const data = await fs.readFile(TOKEN_PATH, 'utf8');
    const tokens = JSON.parse(data);
    oauth2Client.setCredentials(tokens);
    console.log('🔑 Saved Google credentials loaded from disk.');
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokens,
  loadSavedTokens
};