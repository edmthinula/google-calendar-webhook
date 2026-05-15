require('dotenv').config()
const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { google } = require('googleapis')
const fs = require('fs').promises
const path = require('path')

// Import our custom modules
const { oauth2Client, getAuthUrl, getTokens } = require('./auth')
const { fetchNewSyncToken } = require('./sync')
const { handleWebhook } = require('./webhook')
const { saveChannelData, isWatchActive } = require('./channel')

const app = express()
const PORT = process.env.PORT || 3000

// 1. START THE LOGIN FLOW
app.get('/', (req, res) => {
  const url = getAuthUrl()
  res.redirect(url)
})

// 2. THE CALLBACK & WATCH TRIGGER
app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query

  try {
    // 1. Exchange the code for tokens and set them in our auth client (CRUCIAL)
    await getTokens(code)
    console.log('✅ Authenticated successfully!')

    // 2. Initialize the Google Calendar API client (Fixes the ReferenceError)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // 3. Grab the initial bookmark before starting the watch
    await fetchNewSyncToken(calendar)

    // 4. Check if we already have an active watch
    const active = await isWatchActive()

    if (!active) {
      console.log('No active watch found. Creating a new one...')
      const newChannelId = uuidv4()

      const watchResponse = await calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: newChannelId,
          type: 'web_hook',
          address: process.env.WEBHOOK_URL
        }
      })

      // Save the crucial details Google gives back so we don't create duplicates later
      await saveChannelData(
        newChannelId,
        watchResponse.data.resourceId,
        watchResponse.data.expiration
      )

      console.log('✅ Webhook Watch created successfully!')
    } else {
      console.log('⏩ Skipped creating a new watch to prevent duplicates.')
    }

    res.send('<h1>Setup Complete!</h1><p>Check your console.</p>')
  } catch (err) {
    // Wrapping this in a try/catch prevents the server from crashing if Google throws an error!
    console.error('Error during setup:', err)
    res.status(500).send(`Setup failed: ${err.message}`)
  }
})

// 3. THE WEBHOOK RECEIVER
// Pass the incoming request to our webhook controller
app.post('/webhook', handleWebhook)

app.listen(PORT, () => {
  console.log(
    `🚀 Server running! Go to http://localhost:${PORT} to authenticate.`
  )
})

// 4. STOP A SPECIFIC WATCH (Using Path Parameters)
// Example usage: http://localhost:3000/stop/YOUR_CHANNEL_ID/YOUR_RESOURCE_ID
app.get('/stop/:channelId/:resourceId', async (req, res) => {
  const { channelId, resourceId } = req.params

  try {
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId: resourceId
      }
    })

    console.log(`🛑 Successfully stopped watch channel: ${channelId}`)
    res.send(
      `<h1>Watch Stopped</h1><p>Successfully stopped channel: ${channelId}</p>`
    )
  } catch (err) {
    console.error('Error stopping watch:', err.message)
    res.status(500).send(`Failed to stop watch: ${err.message}`)
  }
})

// 5. STOP THE CURRENTLY ACTIVE WATCH (Reads from your channel.json)
// Example usage: http://localhost:3000/stop-active
app.get('/stop-active', async (req, res) => {
  try {
    // Read the current channel data
    const activeChannel = await getChannelData()

    if (!activeChannel) {
      return res.send('No active watch found on disk to stop.')
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendar.channels.stop({
      requestBody: {
        id: activeChannel.channelId,
        resourceId: activeChannel.resourceId
      }
    })

    // Delete the local file so the server knows it's gone
    const CHANNEL_PATH = path.join(__dirname, '../data/channel.json')
    await fs.unlink(CHANNEL_PATH).catch(() => console.log('No file to delete.'))

    console.log(`🛑 Successfully stopped ACTIVE watch and cleared local data.`)
    res.send(
      '<h1>Active Watch Stopped</h1><p>The channel has been closed and local data cleared.</p>'
    )
  } catch (err) {
    console.error('Error stopping active watch:', err.message)
    res.status(500).send(`Failed to stop active watch: ${err.message}`)
  }
})
