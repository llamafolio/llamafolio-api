import '../environment'

import { handleUpdateProtocolsTokens } from '@handlers/updateProtocolsTokens'

function help() {
  console.log('pnpm run update-protocols-tokens')
}

/**
 * Extract all tokens defined in our adapters and store missing tokens
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-protocols-tokens.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  try {
    await handleUpdateProtocolsTokens()
  } catch (e) {
    console.log('Failed to insert tokens', e)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
