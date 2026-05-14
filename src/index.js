require('dotenv').config()
const express = require('express')
const { v4: uuidv4 } = require('uuid')
const { google } = require('googleapis')

// Import our custom modules
const { oauth2Client, getAuthUrl, getTokens } = require('./auth')
const { fetchNewSyncToken } = require('./sync')
const { handleWebhook } = require('./webhook')

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
    // Exchange the code for tokens and set them in our auth client
    await getTokens(code)
    console.log('✅ Authenticated successfully!')

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Grab the initial bookmark and save it to disk BEFORE starting the watch
    await fetchNewSyncToken(calendar)

    // Trigger the Webhook Watch
    await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: uuidv4(), // Google requires a unique ID for every watch request
        type: 'web_hook',
        address: process.env.WEBHOOK_URL
      }
    })

    console.log('✅ Webhook Watch created successfully!')
    res.send(
      '<h1>Authentication and Watch Setup Complete!</h1><p>You can close this tab and check your server console.</p>'
    )
  } catch (err) {
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
