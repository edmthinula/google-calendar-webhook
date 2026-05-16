
# Google Calendar Webhook Boilerplate (Node.js)

A production-ready, highly secure, modular boilerplate for setting up Google Calendar Webhooks (Push Notifications) built natively with modern ES Modules (ESM).

If you are trying to build an app that reacts instantly when a Google Calendar event is created, updated, or deleted—without polling the API constantly, dealing with silent data loss on multi-page updates, or fetching duplicate events—this repository is for you.

---

## ✨ Features

- **Modern ES Modules Architecture:** Built natively with modern JavaScript features (import/export) and clean separation of concerns (auth, sync, webhook, channel, server).
- **Robust Multi-Page Incremental Sync:** Uses a complete page traversal engine (pageToken loop) to ensure large batches of concurrent updates are completely processed without pagination data loss.
- **Cryptographic Automated Setup:** Built-in initialization scripts auto-generate zero-configuration local .env setups layered with high-entropy secure authorization strings.
- **Hardened Administration Routes:** Teardown mechanisms use state-mutation POST vectors strictly guarded by an express authorization token layer to stop unwanted crawler executions or accidental browser-pre-fetches.
- **Credential & Session Persistence:** Securely manages long-lived Google OAuth2 configurations and token refreshes to an encrypted local file state.
- **Ghost Watch Filtering:** Validates incoming webhook headers against active state hashes to immediately ignore duplicate pings from expired channels.
- **Auto-Recovery Framework:** Gracefully traps and self-heals from 410 Gone (Expired Sync Token) exceptions by executing full validation sweeps seamlessly.


## 📂 Project Structure

```plaintext
google-calendar-webhook/
├── data/
│   └── .gitkeep          # Directory where credentials.json and channel.json live
├── scripts/
│   └── init-env.js       # Automated environment constructor & token generator
├── src/
│   ├── index.js          # Main entry file. Initializes server and guarded routings
│   ├── auth.js           # Validates requirements, handles OAuth2 and token storage
│   ├── sync.js           # Manages sync tokens, bookmarks, and 410 error resolution
│   ├── channel.js        # Tracks active resource IDs to discard ghost payloads
│   └── webhook.js        # Core processor loop. Handles paginated change analysis
├── .env.example          # Blueprint definitions for required environment parameters
├── .gitignore            # Keeps variables and temporary file caches off GitHub
├── package.json          # Node dependencies, definitions, and execution hooks
└── README.md
```

## 🛠️ Prerequisites

Before you start, you will need:

- Node.js (v20.0.0+ recommended) installed on your machine.
- A Google Cloud Platform (GCP) account.
- A local tunneling tool like Ngrok or DevTunnels (Google needs a public HTTPS URL to send the webhook to).


## 🚀 Setup Guide

### 1. Google Cloud Setup

1. Go to the Google Cloud Console.
2. Create a new Project.
3. Navigate to **APIs & Services > Library**, search for the Google Calendar API, and enable it.
4. Go to **APIs & Services > OAuth consent screen**:
  - Choose External (or Internal if you have a Google Workspace organization).
  - Complete the mandatory application identification fields.
  - Add the required scope: `https://www.googleapis.com/auth/calendar.readonly`.
  - Add your login email as a Test User (crucial for local testing status).
5. Navigate to **APIs & Services > Credentials**:
  - Click **Create Credentials > OAuth client ID**.
  - Set Application Type to **Web application**.
  - Under Authorized redirect URIs, add exactly: `http://localhost:3000/oauth2callback`.
  - Click Create and copy your Client ID and Client Secret.

### 2. Local Installation

Clone the repository and download project dependencies:

```bash
git clone https://github.com/edmthinula/google-calendar-webhook.git
cd google-calendar-webhook
npm install
```

### 3. Automated Configuration Initialization

Run the automated setup hook to safely spin up your runtime variables configuration. This script copies the system blueprints and injects a unique, cryptographically random ADMIN_TOKEN into your .env layout:

```bash
npm run setup
```

Open the newly created `.env` file in the root of your project and paste your Google Credentials along with your public HTTPS server tunnel address:

```env
CLIENT_ID=your_google_client_id_here
CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/oauth2callback
WEBHOOK_URL=https://your-public-tunnel-url.com/webhook
PORT=3000
DEBUG_RAW_EVENTS = false 

# Generated automatically via npm run setup
ADMIN_TOKEN=a7c8e9b462...
```

> **Note:** Your `WEBHOOK_URL` must point to your active HTTPS tunnel forwarding straight to your local application port (3000) and must explicitly terminate with the `/webhook` path routing.


## 💻 Usage

### 1. Launch the Server

Boot up the server interface locally using Node's hot-reload watch feature:

```bash
npm run dev
```

### 2. Authenticate & Start the Watch

Open your web browser and target your root instance address: [http://localhost:3000](http://localhost:3000).

Authenticate with your Google user profile and grant the required calendar visibility privileges. Once completed, your browser will register a completion confirmation page, and the backend engine will automatically:

- Securely store your operational credentials onto local storage.
- Construct the primary database sync markers.
- Provision a clean push channel interaction hook right with Google Cloud registries.

### 3. Validate Webhook Streams

Open your primary Google Calendar layout, modify/create a target event milestone, and look back at your application terminal log space. You will see a structural representation detailing the modification payloads:

```plaintext
--- 🔔 PROCESSING PAGE OF CHANGES (1 items) ---

📅 EVENT UPDATED / CREATED
  Title:       Sync Alignment and Planning
  Status:      confirmed
  Start:       2026-05-20T10:00:00-07:00
  End:         2026-05-20T10:30:00-07:00
  Location:    Virtual Workspace Bridge
  Description: Weekly technical scope definition...
  Event Link:  https://www.google.com/calendar/event?eid=...
  Event ID:    6abc123xyz

🎉 Successfully processed 1 total events. Sync token advanced.
```

## 🔒 Managing Watches (Hardened Endpoints)

Google Calendar communication hooks operate without an administration telemetry dashboard. To protect your platform from malicious public channel destruction or crawl loops, teardown actions must be handled via authenticated POST request strategies layered with your internal security string:

### Stop the Currently Active Channel

Closes the running subscription channel and wipes out your local tracking state:

```bash
curl -X POST http://localhost:3000/stop-active \
  -H "x-admin-token: YOUR_SECRET_ADMIN_TOKEN_HERE"
```

### Stop a Specific Channel Manually

Used to forcefully wipe out a structural legacy or orphaned resource subscription tracking string using direct path parameters:

```bash
curl -X POST http://localhost:3000/stop/YOUR_CHANNEL_ID/YOUR_RESOURCE_ID \
  -H "x-admin-token: YOUR_SECRET_ADMIN_TOKEN_HERE"
```

## 📚 Official Documentation & References

- [Google Auth Library for Node.js](https://github.com/googleapis/google-auth-library-nodejs)
- [Synchronize Calendar Events Reliably via Google Cloud](https://developers.google.com/calendar/api/guides/sync)
- [Receiving Calendar Push Notifications (Webhooks)](https://developers.google.com/calendar/api/guides/push)