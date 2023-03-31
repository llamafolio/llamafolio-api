import pool from '../src/db/pool'
import { selectChainTokens } from '../src/db/tokens'
import { getMetadatasFromAPI, mergeTokens } from '../src/handlers/getMetadatas'
import { Chain } from '../src/lib/chains'

function help() {
  console.log('npm run revalidate-tokens {chain}')
}

/**
 * Revalidate tokens of a given chain
 */
async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-tokens.ts
  // argv[2]: chain
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const chain = process.argv[2] as Chain | undefined
  const client = await pool.connect()

  try {
    const metadatas = await getMetadatasFromAPI(chain)

    const tokensByAddressesFromAPI: string[] = metadatas.map((data) => data.address.toLowerCase())
    const tokensByAddressesFromDB = await selectChainTokens(client, chain, tokensByAddressesFromAPI)

    const mergedTokens = mergeTokens(metadatas, tokensByAddressesFromDB as any[])

    console.log(mergedTokens)
  } catch (e) {
    console.log(`Failed to revalidate ${chain} tokens`, e)
    await client.query('ROLLBACK')
  } finally {
    client.release(true)
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
