import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CHANNEL_PATH = path.join(__dirname, '../data/channel.json')

/**
 * Saves the active watch channel details to disk.
 */
async function saveChannelData (channelId, resourceId, expiration) {
  try {
    await fs.mkdir(path.dirname(CHANNEL_PATH), { recursive: true });
    const data = JSON.stringify({ channelId, resourceId, expiration })
    await fs.writeFile(CHANNEL_PATH, data, 'utf8')
    console.log('Channel data saved to disk.')
  } catch (error) {
    console.error('Error saving channel data:', error)
  }
}

/**
 * Reads the active channel data from disk.
 */
async function getChannelData () {
  try {
    const data = await fs.readFile(CHANNEL_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    if (error.code === 'ENOENT') return null // File doesn't exist yet
    return null
  }
}

/**
 * Checks if we currently have an active, unexpired watch channel.
 */
async function isWatchActive () {
  const channel = await getChannelData()
  if (!channel) return false

  // Google returns expiration as a Unix timestamp string in milliseconds
  const expirationDate = new Date(parseInt(channel.expiration))
  const now = new Date()

  // If the expiration date is in the future, the watch is still good!
  if (expirationDate > now) {
    console.log(
      `An active watch channel already exists. Expires on: ${expirationDate.toLocaleString()}`
    )
    return true
  }

  console.log('Previous watch channel expired.')
  return false
}

export {
  saveChannelData,
  getChannelData,
  isWatchActive
}
