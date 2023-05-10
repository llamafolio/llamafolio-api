/**
 * This file does two things:
 *  1. Loads `dotenv` to ensure access to environment variables (from .env file)
 *  2. Ensures that the `STAGE` environment variable is set
 */

import environment from '@environment'

export default () => {
  if (!environment.STAGE) {
    console.error('\nSTAGE environment variable is required in .env\n\n')
    process.exit(1)
  }
  if (environment.STAGE == 'dev' && !environment.AWS_GATEWAY_API_ID_DEV) {
    console.error('\nAWS_GATEWAY_API_ID_DEV environment variable is required in .env\n\n')
    process.exit(1)
  }
  if (environment.STAGE == 'prod' && !environment.AWS_GATEWAY_API_ID_PROD) {
    console.error('\nAWS_GATEWAY_API_ID_PROD environment variable is required in .env\n\n')
    process.exit(1)
  }
  // colorize console output
  console.info('\x1b[36m%s\x1b[0m', `\nRUNNING TESTS AGAINST THE FOLLOWING STAGE: ${process.env.STAGE}\n`)
}
