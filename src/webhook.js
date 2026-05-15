const { google } = require('googleapis')
const { oauth2Client } = require('./auth')
const {
  getSavedSyncToken,
  saveSyncToken,
  fetchNewSyncToken
} = require('./sync')
const { getChannelData } = require('./channel')

/**
 * Express route handler for the Google Calendar webhook.
 */
async function handleWebhook (req, res) {
  // 1. Acknowledge receipt immediately.
  res.sendStatus(200)

  // 2. Extract Google's identification headers
  const state = req.headers['x-goog-resource-state']
  const incomingChannelId = req.headers['x-goog-channel-id']
  const incomingResourceId = req.headers['x-goog-resource-id']

  // 3. --- THE GHOST FILTER ---
  // Load the one "true" active channel we created
  const activeChannel = await getChannelData()

  if (activeChannel) {
    // If the ping is from a different channel, ignore it completely!
    if (incomingChannelId !== activeChannel.channelId) {
      // You can comment this log out later if it gets too noisy
      console.log(`👻 Ignored ping from ghost watch (ID: ${incomingChannelId})`)
      return
    }
  }

  // 4. Handle the initial handshake
  if (state === 'sync') {
    console.log('✅ Webhook connected successfully (Initial Sync Handshake).')
    return
  }

  // 5. Process the actual calendar changes
  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const syncToken = await getSavedSyncToken()

    if (!syncToken) {
      console.warn(
        'Webhook received, but no sync token found on disk. Ignoring.'
      )
      return
    }

    const response = await calendar.events.list({
      calendarId: 'primary',
      syncToken: syncToken
    })

    const changes = response.data.items

    if (changes && changes.length > 0) {
      console.log(`\n--- NEW CHANGES DETECTED (${changes.length}) ---`)
      changes.forEach(event => {
        console.log(
          `Event: ${event.summary || 'Deleted Event'} | Status: ${event.status}`
        )
      })
    }

    if (response.data.nextSyncToken) {
      await saveSyncToken(response.data.nextSyncToken)
    }
  } catch (err) {
    if (err.code === 410) {
      console.log('⚠️ Sync token expired (410 Gone). Initiating recovery...')
      try {
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
        await fetchNewSyncToken(calendar)
        console.log('✅ Recovery complete. Ready for next webhook.')
      } catch (recoveryErr) {
        console.error('Failed to recover from 410 error:', recoveryErr.message)
      }
    } else {
      console.error('API Error during webhook processing:', err.message)
    }
  }
}

module.exports = {
  handleWebhook
}
