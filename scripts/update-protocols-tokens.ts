import '../environment'

import { client } from '@db/clickhouse'
import {
  insertERC20Tokens,
  insertERC20TokensDecodeErrors,
  selectUndecodedProtocolsTokens,
  type Token,
} from '@db/tokens'
import type { BaseContext } from '@lib/adapter'
import { groupBy, sliceIntoChunks } from '@lib/array'
import { chainByChainId } from '@lib/chains'
import { getTokenDetails } from '@lib/erc20'

function help() {
  console.log('pnpm run update-protocols-tokens')
}

/**
 * Extract all tokens defined in our adapters and store missing tokens
 */
async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-tokens.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  try {
    const rows = await selectUndecodedProtocolsTokens(client)

    console.log(`Found ${rows.length} undecoded tokens`)

    const rowsByChainId = groupBy(rows, 'chain')

    for (const chainId in rowsByChainId) {
      const chain = chainByChainId[chainId as unknown as number]?.id
      if (!chain) {
        console.error(`Missing chain ${chainId}`)
        continue
      }

      const ctx: BaseContext = { chain, adapterId: '' }

      const addresses = rowsByChainId[chainId].map((row) => row.address)

      const addressesSlices = sliceIntoChunks(addresses, 100)

      for (let i = 0; i < addressesSlices.length; i++) {
        const addressesSlice = addressesSlices[i]
        const tokens = await getTokenDetails(ctx, addressesSlice)

        // remove tokens without ERC20 metadata (decimals, symbol)
        const _tokens: Partial<Token>[] = []
        const errors: Partial<Token>[] = []

        for (const token of tokens) {
          if (token.decimals != null && token.symbol != null) {
            _tokens.push(token)
          } else {
            errors.push(token)
          }
        }

        await insertERC20Tokens(client, _tokens)

        // Keep track of decode attempts. Failures most likely mean that the address is not an ERC20 token.
        // Failures will be skipped in the next decode processes
        await insertERC20TokensDecodeErrors(client, errors)

        console.log(
          `[${i} / ${addressesSlices.length}] Inserted ${_tokens.length} tokens on chain ${chain}, found ${errors.length} without ERC20 metadata`,
        )
      }
    }
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
