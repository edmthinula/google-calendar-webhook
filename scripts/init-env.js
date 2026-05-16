import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

// Recreate __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Navigate to the project root directory
const rootDir = path.join(__dirname, '..')
const envPath = path.join(rootDir, '.env')
const envExamplePath = path.join(rootDir, '.env.example')

async function initializeEnvironment() {
  try {
    // 1. Read the blueprint from .env.example first
    let envContent = ''
    try {
      envContent = await fs.readFile(envExamplePath, 'utf8')
    } catch (err) {
      console.error('❌ Error: `.env.example` file is missing from the root directory.')
      process.exit(1)
    }

    // 2. Generate a cryptographically secure 32-byte cryptographic token
    const secureToken = crypto.randomBytes(32).toString('hex')

    // 3. Swap the placeholder value or append the token directly
    if (envContent.includes('ADMIN_TOKEN=')) {
      envContent = envContent.replace(/ADMIN_TOKEN=.*/, `ADMIN_TOKEN=${secureToken}`)
    } else {
      envContent += `\n\n# Security Token for destroying webhook channels\nADMIN_TOKEN=${secureToken}\n`
    }

    // 4. ATOMIC WRITE: Attempt to create the file exclusively ('wx') with Owner-Only permissions (0o600)
    try {
      await fs.writeFile(envPath, envContent, { 
        encoding: 'utf8', 
        flag: 'wx',    // Fails instantly if the file already exists (Fixes TOCTOU)
        mode: 0o600    // Owner read/write only (Fixes world-readable issue)
      })
      console.log('✅ Success: Generated a secure local `.env` file with a unique ADMIN_TOKEN.')
    } catch (writeErr) {
      // If the error code is EEXIST, the file was already there. We safely skip.
      if (writeErr.code === 'EEXIST') {
        console.log('ℹ️  An existing .env file was found. Skipping token generation to protect existing configurations.')
        return
      }
      // If it's a different error (e.g., permission denied), throw it up the chain
      throw writeErr
    }

  } catch (error) {
    console.error('❌ Failed to initialize environment configurations:', error.message)
    process.exit(1)
  }
}

initializeEnvironment()