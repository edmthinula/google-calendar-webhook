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
    // 1. Guard check: If a .env file already exists, do not overwrite it
    try {
      await fs.access(envPath)
      console.log('ℹ️  An existing .env file was found. Skipping token generation to protect existing configurations.')
      return
    } catch {
      // File doesn't exist, safely proceed to create it
    }

    // 2. Read the blueprint from .env.example
    let envContent = ''
    try {
      envContent = await fs.readFile(envExamplePath, 'utf8')
    } catch (err) {
      console.error('❌ Error: `.env.example` file is missing from the root directory.')
      process.exit(1)
    }

    // 3. Generate a cryptographically secure 32-byte cryptographic token
    const secureToken = crypto.randomBytes(32).toString('hex')

    // 4. Swap the placeholder value or append the token directly
    if (envContent.includes('ADMIN_TOKEN=')) {
      envContent = envContent.replace(/ADMIN_TOKEN=.*/, `ADMIN_TOKEN=${secureToken}`)
    } else {
      envContent += `\n\n# Security Token for destroying webhook channels\nADMIN_TOKEN=${secureToken}\n`
    }

    // 5. Write the final customized file onto disk as operational .env
    await fs.writeFile(envPath, envContent, 'utf8')
    console.log('✅ Success: Generated a secure local `.env` file with a unique ADMIN_TOKEN.')

  } catch (error) {
    console.error('❌ Failed to initialize environment configurations:', error.message)
    process.exit(1)
  }
}

initializeEnvironment()