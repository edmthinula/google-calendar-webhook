require('dotenv').config()
const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { google } = require('googleapis')

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
})

// 3. THE WEBHOOK RECEIVER
// Pass the incoming request to our webhook controller
app.post('/webhook', handleWebhook)

app.listen(PORT, () => {
  console.log(
    `🚀 Server running! Go to http://localhost:${PORT} to authenticate.`
  )
})
