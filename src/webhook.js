import { google } from 'googleapis'
import { oauth2Client } from './auth.js'
import { getSavedSyncToken, saveSyncToken, fetchNewSyncToken } from './sync.js'
import { getChannelData } from './channel.js'

/**
 * Express route handler for the Google Calendar webhook.
 * Handles high-volume incremental sync changes using pageToken pagination loops.
 */
async function handleWebhook (req, res) {
  // 1. Acknowledge receipt immediately so Google doesn't timeout and retry
  res.sendStatus(200)

  // 2. Extract Google's identification headers
  const state = req.headers['x-goog-resource-state']
  const incomingChannelId = req.headers['x-goog-channel-id']

  // 3. --- THE GHOST FILTER ---
  const activeChannel = await getChannelData()

  // HARDENED: Reject if we have no active channel, OR if the IDs don't match
  if (!activeChannel || incomingChannelId !== activeChannel.channelId) {
    console.log(
      `👻 Ignored unauthorized or ghost ping (Incoming ID: ${incomingChannelId})`
    )
    return
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

    let pageToken = null
    let nextSyncToken = null
    let totalChangesDetected = 0

    // Loop continuously through pagination tokens until we reach the final page
    do {
      const response = await calendar.events.list({
        calendarId: 'primary',
        syncToken: syncToken,
        pageToken: pageToken || undefined // If null/undefined, Google fetches page 1
      })

      const changes = response.data.items

      if (changes && changes.length > 0) {
        totalChangesDetected += changes.length
        console.log(
          `\n--- 🔔 PROCESSING PAGE OF CHANGES (${changes.length} items) ---`
        )

        changes.forEach(event => {
          // 1. Handle Deleted Events First
          if (event.status === 'cancelled') {
            console.log(`\n❌ EVENT DELETED`)
            console.log(`   Event ID: ${event.id}`)
            return
          }

          // 2. Extract Data Safely
          const title = event.summary || '(No Title)'
          const status = event.status || 'Unknown'
          const location = event.location || '(No location specified)'
          const link = event.htmlLink || 'No link available'

          // Clean up the description
          let description
          if (event.description) {
            const stripped = event.description.replace(/(<([^>]+)>)/gi, '')
            description =
              stripped.length > 100
                ? stripped.substring(0, 100) + '...'
                : stripped
          } else {
            description = '(No description)'
          }

          // 3. Handle All-Day vs Timed Event quirk
          const startTime =
            event.start?.dateTime || event.start?.date || 'Unknown Start'
          const endTime =
            event.end?.dateTime || event.end?.date || 'Unknown End'

          // 4. Log beautifully
          console.log(`\n📅 EVENT UPDATED / CREATED`)
          console.log(`   Title:       ${title}`)
          console.log(`   Status:      ${status}`)
          console.log(`   Start:       ${startTime}`)
          console.log(`   End:         ${endTime}`)
          console.log(`   Location:    ${location}`)
          console.log(`   Description: ${description}`)
          console.log(`   Event Link:  ${link}`)
          console.log(`   Event ID:    ${event.id}`)

          if (process.env.DEBUG_RAW_EVENTS === 'true') {
            console.log('   Raw Data:', JSON.stringify(event, null, 2))
          }
        })
      }

      // Capture the next page token if it exists
      pageToken = response.data.nextPageToken

      // Capture the next sync token (Google only supplies this on the absolute LAST page)
      if (response.data.nextSyncToken) {
        nextSyncToken = response.data.nextSyncToken
      }
    } while (pageToken) // Keep spinning if there are more pages

    // 6. Permanently advance the sync bookmark ONLY after evaluating all pages
    if (nextSyncToken) {
      await saveSyncToken(nextSyncToken)
      console.log(
        `\n🎉 Successfully processed ${totalChangesDetected} total events. Sync token advanced.`
      )
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

// Named export for ES Modules
export { handleWebhook }
