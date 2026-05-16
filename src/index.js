import 'dotenv/config'
import dotenv from 'dotenv';
import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import { google } from 'googleapis'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
dotenv.config()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
import { oauth2Client, getAuthUrl, getTokens, loadSavedTokens } from './auth.js'
import { fetchNewSyncToken } from './sync.js'
import { handleWebhook } from './webhook.js'
import { saveChannelData, isWatchActive, getChannelData } from './channel.js'

const app = express()
const PORT = process.env.PORT || 3000

/**
 * Middleware to protect destructive endpoints from unauthorized public execution
 */
function requireAdminToken (req, res, next) {
  const token = req.get('x-admin-token')

  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    console.warn(`⚠️ Unauthorized teardown attempt blocked from IP: ${req.ip}`)
    return res
      .status(401)
      .json({ error: 'Unauthorized: Invalid or missing administrative token.' })
  }

  next()
}

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

    // 2. Initialize the Google Calendar API client
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
    console.error('Error during setup:', err)
    res.status(500).send(`Setup failed: ${err.message}`)
  }
})

// 3. THE WEBHOOK RECEIVER
// Pass the incoming request to our webhook controller
app.post('/webhook', handleWebhook)

// 4. STOP A SPECIFIC WATCH (Hardened: POST method with Authentication)
// Example usage: Trigger via curl or postman providing the `x-admin-token` header
app.post(
  '/stop/:channelId/:resourceId',
  requireAdminToken,
  async (req, res) => {
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
      res.json({
        success: true,
        message: `Successfully stopped channel: ${channelId}`
      })
    } catch (err) {
      console.error('Error stopping watch:', err.message)
      res.status(500).json({ error: `Failed to stop watch: ${err.message}` })
    }
  }
)

// 5. STOP THE CURRENTLY ACTIVE WATCH (Hardened: POST method with Authentication)
app.post('/stop-active', requireAdminToken, async (req, res) => {
  try {
    // Read the current channel data
    const activeChannel = await getChannelData()

    if (!activeChannel) {
      return res
        .status(404)
        .json({ error: 'No active watch found on disk to stop.' })
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
    res.json({
      success: true,
      message: 'The active channel has been closed and local data cleared.'
    })
  } catch (err) {
    console.error('Error stopping active watch:', err.message)
    res
      .status(500)
      .json({ error: `Failed to stop active watch: ${err.message}` })
  }
})

// Load runtime credentials on initialization
loadSavedTokens().then(loaded => {
  if (!loaded) {
    console.log(
      '⚠️ No saved credentials found. You MUST visit http://localhost:3000 to authenticate first.'
    )
  }
})

app.listen(PORT, () => {
  console.log(
    `🚀 Server running! Go to http://localhost:${PORT} to authenticate.`
  )
})
