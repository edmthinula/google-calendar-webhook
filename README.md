# Google Calendar Webhook Boilerplate (Node.js)

A production-ready, modular boilerplate for setting up Google Calendar Webhooks (Push Notifications) with **Incremental Sync** and **Auto-Recovery** for expired tokens. 

If you are trying to build an app that reacts instantly when a Google Calendar event is created, updated, or deleted—without polling the API constantly or downloading duplicate events—this repository is for you.

## ✨ Features
* **Modular Architecture:** Clean separation of concerns (`auth`, `sync`, `webhook`, `server`).
* **Incremental Sync:** Uses `syncToken` to fetch *only* the events that changed since the last webhook ping.
* **State Persistence:** Saves the `syncToken` locally to a JSON file so your app remembers its place even if the server restarts.
* **Auto-Recovery:** Gracefully handles the dreaded `410 Gone` error (Expired Sync Token) by automatically doing a fresh full-sync without crashing.
* **Secure Setup:** Uses environment variables to keep your Google credentials out of your source code.

---

## 📂 Project Structure

```text
google-calendar-webhook-boilerplate/
├── src/
│   ├── index.js          # Starts the Express server and ties everything together
│   ├── auth.js           # Handles Google OAuth2 login and token generation
│   ├── sync.js           # Handles Full Sync, saving to disk, and 410 Recovery
│   └── webhook.js        # The POST route logic to process event changes
├── data/
│   └── .gitkeep          # Directory where token.json will be saved locally
├── .env.example          # Template for required environment variables
├── .gitignore            # Keeps your secrets and node_modules off GitHub
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

**Note:** Make sure your `WEBHOOK_URL` is an active HTTPS tunnel pointing to your local port 3000.

## 💻 Usage

### 1. Start the Server

Run the application:

```bash
node src/index.js
```

### 2. Authenticate & Start the Watch

Open your browser and go to [http://localhost:3000](http://localhost:3000).

Log in with your Google Account and grant permission.

Once redirected, the app will automatically perform an initial sync, save your syncToken to `data/token.json`, and register the webhook with Google.

### 3. Test It!

Go to your Google Calendar and create, edit, or delete an event. Within a few seconds, you should see a ping in your terminal detailing the exact change!

## 📚 Official Documentation & References

- [Google Auth Library for Node.js](https://github.com/googleapis/google-auth-library-nodejs)
- [Synchronize Calendar Events Reliably](https://developers.google.com/calendar/api/guides/sync)
- [Receiving Push Notifications (Webhooks)](https://developers.google.com/calendar/api/guides/push)