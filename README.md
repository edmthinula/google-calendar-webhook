# Google Calendar Webhook Boilerplate

A production-ready, modular Node.js boilerplate for setting up real-time Google Calendar Webhooks (Push Notifications) without polling. It features robust token management, incremental sync logic, a built-in "ghost filter" to ignore expired channels, and self-healing token recovery.

## ✨ Features

- **Reliable Incremental Sync:** Uses pagination loops (`pageToken`) to process large batches of concurrent updates without data loss.
- **Auto-Refresh Token Management:** Automatically saves and merges fresh OAuth2 refresh tokens to local storage to maintain a continuous runtime state.
- **Ghost Watch Filtering:** Validates incoming webhook headers against the active channel state to safely drop duplicate pings from expired subscriptions.
- **Auto-Recovery Lifecycle:** Gracefully catches `410 Gone` (expired sync token) errors and automatically initiates an instant recovery sweep to re-sync bookmarks.
- **Hardened Admin Routes:** Features administrative endpoints protected by a custom `x-admin-token` header to safely terminate active watch channels without risk of public abuse.

## 📂 Project Structure

```plaintext
google-calendar-webhook/
├── data/
│   └── .gitkeep          # Directory for local credentials.json and channel.json
├── scripts/
│   └── init-env.js       # Auto-generates local configuration layer
├── src/
│   ├── index.js          # Server entry point and protected endpoint routes
│   ├── auth.js           # OAuth2 client instance, login flows, and token persistence
│   ├── sync.js           # Handles sync tokens, bookmarks, and 410 remediation
│   ├── channel.js        # Tracks active resource state to filter out duplicate pings
│   └── webhook.js        # Event processing loop with paginated change analysis
├── .env.example          # Blueprint definitions for your environmental variables
├── package.json          # Core project dependencies and execution scripts
└── README.md
```

## 🛠️ Prerequisites

- **Node.js:** v20.0.0+ recommended.
- **A Google Cloud Platform (GCP) Account** with an active project.
- **A Local Tunneling Tool:** (e.g., Ngrok, Localtunnel, or DevTunnels) to expose your local port via public HTTPS for Google's webhook payloads.

## 🚀 Setup & Configuration

### 1. Google Cloud Platform Configuration

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project, visit the API Library, search for the **Google Calendar API**, and enable it.
3. Go to **APIs & Services > OAuth consent screen**:
   - Select **External** user type.
   - Fill out the required configuration settings.
   - Add the following scope: `https://www.googleapis.com/auth/calendar.readonly`.
   - Add your own Google Email under **Test Users** (required for sandbox testing).
4. Go to **APIs & Services > Credentials**:
   - Click **Create Credentials > OAuth client ID**.
   - Select **Web application** as the type.
   - Add exactly `http://localhost:3000/oauth2callback` into the **Authorized redirect URIs** block.
   - Save the configuration and securely copy your **Client ID** and **Client Secret**.

### 2. Local Installation

Clone the repository and install the development dependencies:

```bash
git clone https://github.com/edmthinula/google-calendar-webhook.git
cd google-calendar-webhook
npm install
```

### 3. Initialize Environment Configurations

Generate your local `.env` setup using the built-in initializer script:

```bash
npm run setup
```

Open the generated `.env` file and populate your Google Developer values along with your public HTTPS tunnel forwarding target:

```plaintext
CLIENT_ID=your_google_client_id_here
CLIENT_SECRET=your_google_client_secret_here
REDIRECT_URI=http://localhost:3000/oauth2callback
WEBHOOK_URL=https://your-public-tunnel-url.com/webhook
PORT=3000
DEBUG_RAW_EVENTS=false

# Generated automatically during setup script execution
ADMIN_TOKEN=a7c8e9b462...
```

> **Important:** The `WEBHOOK_URL` must point directly to your live public tunnel HTTPS address and explicitly terminate with the `/webhook` path.

## 💻 Running the Application

### 1. Fire up the Server

Launch the local application inside development tracking mode:

```bash
npm run dev
```

### 2. Complete the OAuth Authentication Dance

1. Open your browser and navigate to the base route: `http://localhost:3000`.
2. Sign in with your registered Google Test User account and grant permissions. Upon redirected success, the core engine will automatically complete the following operations under the hood:
   - Save authorization secrets directly to your server environment.
   - Initialize your baseline calendar sync state bookmarks.
   - Spin up an operational webhook stream directly targeting your exposed public URL.

### 3. Webhook Stream Inspection

Modify, delete, or create any entry inside your actual Google Calendar UI. Your server terminal will log the parsed event changes in real-time:

```plaintext
--- 🔔 PROCESSING PAGE OF CHANGES (1 items) ---

📅 EVENT UPDATED / CREATED
   Title:       Sync Alignment and Planning
   Status:      confirmed
   Start:       2026-05-20T10:00:00-07:00
   End:         2026-05-20T10:30:00-07:00
   Location:    Virtual Workspace Bridge
   Description: Weekly technical scope definition...
   Event ID:    6abc123xyz

🎉 Successfully processed 1 total events. Sync token advanced.
```

## 🔒 Administrative Endpoint Controls

Because active Google Calendar push hooks don't have a visual UI dashboard, managing them can be a hassle. To stop random crawlers from executing destructive actions, the cleanup endpoints are configured as POST actions requiring your local `ADMIN_TOKEN`:

### Teardown the Currently Active Watch Channel

Gracefully unsubscribes from Google pushes and updates the local storage records:

```bash
curl -X POST http://localhost:3000/stop-active \
  -H "x-admin-token: YOUR_SECRET_ADMIN_TOKEN_HERE"
```

### Forcefully Clear a Legacy or Orphaned Channel

Wipes out an explicitly named channel subscription using precise parameters:

```bash
curl -X POST http://localhost:3000/stop/YOUR_CHANNEL_ID/YOUR_RESOURCE_ID \
  -H "x-admin-token: YOUR_SECRET_ADMIN_TOKEN_HERE"
```