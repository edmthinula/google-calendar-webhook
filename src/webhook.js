const { google } = require('googleapis');
const { oauth2Client } = require('./auth');
const { getSavedSyncToken, saveSyncToken, fetchNewSyncToken } = require('./sync');

/**
 * Express route handler for the Google Calendar webhook.
 */
async function handleWebhook(req, res) {
  // 1. Acknowledge receipt immediately.
  // If you don't respond with 200 OK quickly, Google will assume your 
  // server is dead and will retry the notification with exponential backoff.
  res.sendStatus(200);

  // Google sends headers describing the event. 
  // 'sync' means it's the initial connection handshake. 'exists' means an event changed.
  const state = req.headers['x-goog-resource-state'];
  
  if (state === 'sync') {
    console.log('Webhook connected successfully (Initial Sync Handshake).');
    return; 
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Read our saved bookmark from the hard drive
    const syncToken = await getSavedSyncToken();

    if (!syncToken) {
      console.warn("Webhook received, but no sync token found on disk. Ignoring.");
      return;
    }

    // 2. Fetch ONLY the changes since our last bookmark
    const response = await calendar.events.list({
      calendarId: 'primary',
      syncToken: syncToken, 
    });

    const changes = response.data.items;
    
    if (changes && changes.length > 0) {
      console.log(`\n--- NEW CHANGES DETECTED (${changes.length}) ---`);
      changes.forEach(event => {
        // Status can be 'confirmed', 'tentative', or 'cancelled' (deleted)
        console.log(`Event: ${event.summary || 'Deleted Event'} | Status: ${event.status}`);
      });
    }

    // 3. Save the NEW bookmark to the hard drive for next time
    if (response.data.nextSyncToken) {
      await saveSyncToken(response.data.nextSyncToken);
    }

  } catch (err) {
    // 4. HANDLE THE 410 EXPIRED TOKEN ERROR
    if (err.code === 410) {
      console.log('⚠️ Sync token expired (410 Gone). Initiating recovery...');
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        // Re-run the full sync to get a fresh bookmark. 
        // Our fetchNewSyncToken function automatically saves it to disk!
        await fetchNewSyncToken(calendar);
        console.log('✅ Recovery complete. Ready for next webhook.');
      } catch (recoveryErr) {
        console.error('Failed to recover from 410 error:', recoveryErr.message);
      }
    } else {
      console.error('API Error during webhook processing:', err.message);
    }
  }
}

module.exports = {
  handleWebhook
};