const fs = require('fs').promises;
const path = require('path');

// Determine where to save the token file
const TOKEN_PATH = path.join(__dirname, '../data/token.json');

/**
 * Saves the sync token to a local JSON file.
 * @param {string} token - The sync token provided by Google.
 */
async function saveSyncToken(token) {
  try {
    const data = JSON.stringify({ syncToken: token });
    await fs.writeFile(TOKEN_PATH, data, 'utf8');
    console.log('Sync token saved to file successfully.');
  } catch (error) {
    console.error('Error saving sync token:', error);
  }
}

/**
 * Reads the saved sync token from the local JSON file.
 * @returns {string|null} The token, or null if it doesn't exist.
 */
async function getSavedSyncToken() {
  try {
    const data = await fs.readFile(TOKEN_PATH, 'utf8');
    const parsedData = JSON.parse(data);
    return parsedData.syncToken;
  } catch (error) {
    // If the file doesn't exist yet, that's fine. We return null.
    if (error.code === 'ENOENT') return null;
    console.error('Error reading sync token:', error);
    return null;
  }
}

/**
 * Performs a full sync to grab the latest syncToken.
 * Pages through recent events until Google provides a nextSyncToken.
 * @param {object} calendar - The authenticated Google Calendar instance.
 */
async function fetchNewSyncToken(calendar) {
  console.log("Fetching a fresh Sync Token from Google...");
  let pageToken = null;
  let syncToken = null;

  do {
    const response = await calendar.events.list({
      calendarId: 'primary',
      pageToken: pageToken,
      timeMin: new Date().toISOString() // Look from right now onward to save time
    });

    // Google gives us pages to flip through if there are many events
    pageToken = response.data.nextPageToken;
    
    // Once we hit the final page, Google gives us the syncToken
    if (response.data.nextSyncToken) {
      syncToken = response.data.nextSyncToken;
    }
  } while (pageToken);

  console.log("Successfully captured new Sync Token.");
  // Save it to the file immediately!
  await saveSyncToken(syncToken);
  
  return syncToken;
}

module.exports = {
  saveSyncToken,
  getSavedSyncToken,
  fetchNewSyncToken
};