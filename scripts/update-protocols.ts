import { fetchProtocols } from '../src/lib/protocols'

async function main() {
  try {
    const protocols = await fetchProtocols()
    console.log(protocols)
  } catch (e) {
    console.log('Failed to update balances', e)
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
