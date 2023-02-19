import '../env'

import { fetchProtocols } from '../src/handlers/updateProtocols'

async function main() {
  try {
    const protocols = await fetchProtocols()

    console.log(protocols)
  } catch (e) {
    console.log('Failed to update protocols', e)
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
