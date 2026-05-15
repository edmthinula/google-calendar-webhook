# Google Calendar Webhook Boilerplate (Node.js)

A production-ready, modular boilerplate for setting up Google Calendar Webhooks (Push Notifications). 

If you are trying to build an app that reacts instantly when a Google Calendar event is created, updated, or deleted—without polling the API constantly or fetching duplicate events—this repository is for you.

## ✨ Features
* **Modular Architecture:** Clean separation of concerns (`auth`, `sync`, `webhook`, `channel`, `server`).
* **Incremental Sync:** Uses `syncToken` to fetch *only* the events that changed since the last webhook ping.
* **Credential Persistence:** Saves OAuth tokens to a local JSON file so your app stays authenticated even if the server restarts.
* **Ghost Watch Filtering:** Validates incoming webhook headers against your active channel ID to automatically ignore duplicate pings from old/expired watches.
* **Auto-Recovery:** Gracefully handles the dreaded `410 Gone` error (Expired Sync Token) by automatically performing a fresh full-sync without crashing.
* **Watch Management:** Built-in endpoints to gracefully close active webhook channels.
* **Rich Event Parsing:** Automatically parses the webhook payload into clean, readable terminal logs (Title, Start/End Time, Location, Description).

---

## 📂 Project Structure

```text
google-calendar-webhook-boilerplate/
├── src/
│   ├── index.js          # Starts the Express server and routing
│   ├── auth.js           # Handles Google OAuth2 login and token persistence
│   ├── sync.js           # Handles Full Sync, saving bookmarks, and 410 Recovery
│   ├── channel.js        # Manages active watch data to prevent duplicate channels
│   └── webhook.js        # The POST route logic to process and filter event changes
├── data/
│   └── .gitkeep          # Directory where credentials.json, token.json, and channel.json live
├── .env.example          # Template for required environment variables
├── .gitignore            # Keeps your secrets and local data off GitHub
├── package.json
└── README.md
```

## 🛠️ Prerequisites

Before you start, you will need:

- Node.js installed on your machine.
- A Google Cloud Platform (GCP) account.
- A local tunneling tool like Ngrok or DevTunnels (Google needs a public HTTPS URL to send the webhook to).

## 🚀 Setup Guide

### 1. Google Cloud Setup (The hardest part!)

1. Go to the Google Cloud Console.
2. Create a new Project.
3. Go to **APIs & Services > Library** and enable the Google Calendar API.
4. Go to **APIs & Services > OAuth consent screen**.
5. Choose External (or Internal if you have a Google Workspace).
6. Fill out the required app name and email fields.
7. Add the scope: `https://www.googleapis.com/auth/calendar.readonly`.
8. Add your own email as a Test User (**crucial!**).
9. Go to **APIs & Services > Credentials**.
10. Click **Create Credentials > OAuth client ID**.
    - Application Type: Web application.
    - Authorized redirect URIs: Add `http://localhost:3000/oauth2callback`.
    - Click Create. Copy your Client ID and Client Secret.

### 2. Local Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/YOUR_USERNAME/google-calendar-webhook-boilerplate.git
cd google-calendar-webhook-boilerplate
npm install
```

### 3. Environment Variables

Create a file named `.env` in the root directory (do not commit this file!) and copy the contents from `.env.example`:

```env
CLIENT_ID=your_google_client_id_here
CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/oauth2callback
WEBHOOK_URL=https://your-public-tunnel-url.com/webhook
PORT=3000
```

**Note:** Make sure your `WEBHOOK_URL` is an active HTTPS tunnel pointing to your local port 3000. It must end in `/webhook`.

## 💻 Usage

### 1. Start the Server

Run the application:

```bash
node src/index.js
# Or use npm run dev if you have nodemon configured
```

### 2. Authenticate & Start the Watch

Open your browser and go to [http://localhost:3000](http://localhost:3000).

Log in with your Google Account and grant permission.

Once redirected, the app will automatically:

- Save your login credentials to disk.
- Perform an initial sync and save your syncToken.
- Register the webhook with Google and save the channelId.

### 3. Test It!

Go to your Google Calendar and create, edit, or delete an event. Within a few seconds, you should see a beautifully formatted ping in your terminal:

```text
--- 🔔 NEW CHANGES DETECTED (1) ---

📅 EVENT UPDATED / CREATED
   Title:       Team Standup Meeting
   Status:      confirmed
   Start:       2026-05-20T10:00:00-07:00
   End:         2026-05-20T10:30:00-07:00
   Location:    Zoom Room 1
   Description: Daily sync to discuss blockers...
```

## 4. Managing Watches (Endpoints)

Google Calendar webhooks do not have a dashboard. If you need to stop a webhook to reset your environment, use the built-in endpoints:

- **Stop Active Watch:** Visit [http://localhost:3000/stop-active](http://localhost:3000/stop-active) to gracefully close the current channel and delete your local `channel.json` record.
- **Stop Specific Watch:** Visit `http://localhost:3000/stop/CHANNEL_ID_HERE/RESOURCE_ID_HERE` if you manually need to kill an orphaned watch (you will need the specific IDs from your logs).

## 📚 Official Documentation & References

- [Google Auth Library for Node.js](https://github.com/googleapis/google-auth-library-nodejs)
- [Synchronize Calendar Events Reliably](https://developers.google.com/calendar/api/guides/sync)
- [Receiving Push Notifications (Webhooks)](https://developers.google.com/calendar/api/guides/push)