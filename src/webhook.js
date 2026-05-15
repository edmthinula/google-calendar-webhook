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
      console.log(`\n--- 🔔 NEW CHANGES DETECTED (${changes.length}) ---`)

      changes.forEach(event => {
        // 1. Handle Deleted Events First
        if (event.status === 'cancelled') {
          console.log(`\n❌ EVENT DELETED`)
          console.log(`   Event ID: ${event.id}`)
          return // Stop processing this specific event, as it has no other data
        }

        // 2. Extract Data Safely
        const title = event.summary || '(No Title)'
        const status = event.status || 'Unknown'
        const location = event.location || '(No location specified)'
        const link = event.htmlLink || 'No link available'

        // Clean up the description (strip HTML or limit length if needed)
        const description = event.description
          ? event.description.replace(/(<([^>]+)>)/gi, '').substring(0, 100) +
            '...'
          : '(No description)'

        // 3. Handle the All-Day vs Timed Event quirk
        const startTime =
          event.start?.dateTime || event.start?.date || 'Unknown Start'
        const endTime = event.end?.dateTime || event.end?.date || 'Unknown End'

        // 4. Log it beautifully
        console.log(`\n📅 EVENT UPDATED / CREATED`)
        console.log(`   Title:       ${title}`)
        console.log(`   Status:      ${status}`)
        console.log(`   Start:       ${startTime}`)
        console.log(`   End:         ${endTime}`)
        console.log(`   Location:    ${location}`)
        console.log(`   Description: ${description}`)
        console.log(`   Event Link:  ${link}`)
        console.log(`   Event ID:    ${event.id}`)

        // TIP: If you literally want to see the RAW JSON payload from Google:
        console.log("   Raw Data:", JSON.stringify(event, null, 2));
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
