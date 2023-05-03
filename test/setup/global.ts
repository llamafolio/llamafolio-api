/**
 * This file does two things:
 *  1. Loads `dotenv` to ensure access to environment variables (from .env file)
 *  2. Ensures that the `STAGE` environment variable is set
 */

import 'dotenv/config'

export default () => {
  if (!process.env.STAGE) {
    console.error('\nSTAGE environment variable is required in .env\n\n')
    process.exit(1)
  }
}
