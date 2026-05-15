require('dotenv').config()
const { google } = require('googleapis')

// 1. Initialize the OAuth2 client using environment variables
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
)

// Access scopes for two non-Sign-In scopes: Google Calendar
const scopes = ['https://www.googleapis.com/auth/calendar.readonly']

/**
 * Generates the Google Login URL.
 * We request 'offline' access and force 'consent' to ensure Google
 * provides a Refresh Token, which is critical for long-running apps.
 */
function getAuthUrl () {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes
  })
}

/**
 * Trades the authorization code for access and refresh tokens.
 * @param {string} code - The code returned by Google in the callback URL.
 */
async function getTokens (code) {
  const { tokens } = await oauth2Client.getToken(code)

  // Set the credentials globally for this client instance
  oauth2Client.setCredentials(tokens)

  return tokens
}

module.exports = {
  oauth2Client,
  getAuthUrl,
  getTokens
}
