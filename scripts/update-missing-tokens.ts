import '../environment'

import { client } from '@db/clickhouse'
import type { BaseContext } from '@lib/adapter'
import { chainById } from '@lib/chains'
import { abi } from '@lib/erc20'
import { type Call, multicall } from '@lib/multicall'
import { isNotNullish } from '@lib/type'

function help() {
  console.log('pnpm run update-tokens')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: update-missing-tokens.ts
  // argv[2]: chain
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const chain = chainById[process.argv[2]]
  if (!chain) {
    console.error('Could not find chain with id', process.argv[2])
    return process.exit(1)
  }

  const ctx: BaseContext = { chain: chain.id, adapterId: '' }

  let prevTokensKey = ''

  try {
    for (;;) {
      const hrstart = process.hrtime()

      // TODO: handle ERC721 and ERC1155
      const queryRes = await client.query({
        query: `
        SELECT DISTINCT("address") FROM evm_indexer2.token_transfers AS "tt"
        WHERE
            tt."chain" = {chainId: UInt64} AND
            tt."type" = 'erc20' AND
            tt."address" NOT IN (
                SELECT "address" FROM evm_indexer2.tokens
                WHERE "chain" = {chainId: UInt64}
            )
        LIMIT 100;
      `,
        query_params: { chainId: chain.chainId },
      })

      const res = (await queryRes.json()) as {
        data: { address: `0x${string}` }[]
      }

      console.log(`Found ${res.data.length} missing tokens`)

      const currentTokensKey = res.data
        .map((row) => row.address.toLowerCase())
        .sort()
        .join('##')

      if (res.data.length === 0 || (prevTokensKey && currentTokensKey === prevTokensKey)) {
        console.log('Done')
        return process.exit(0)
      }

      prevTokensKey = currentTokensKey

      // Decode
      const calls: Call<typeof abi.symbol>[] = res.data.map((row) => ({ target: row.address })).filter(isNotNullish)

      const tokens: any[] = []

      const [names, symbols, decimals] = await Promise.all([
        multicall({ ctx, calls, abi: abi.name }),
        multicall({ ctx, calls, abi: abi.symbol }),
        multicall({ ctx, calls, abi: abi.decimals }),
      ])

      for (let i = 0; i < calls.length; i++) {
        const address = calls[i].target
        const nameRes = names[i]
        const decimalsRes = decimals[i]
        const symbolRes = symbols[i]

        if (decimalsRes.success && decimalsRes.output > 128) {
          continue
        }

        tokens.push({
          chain: chain.chainId,
          address,
          type: 'erc20',
          decimals: decimalsRes.output,
          symbol: symbolRes.output,
          name: nameRes.output,
          coingecko_id: null,
          cmc_id: null,
          stable: false,
        })
      }

      await client.insert({
        table: 'evm_indexer2.tokens',
        values: tokens,
        format: 'JSONEachRow',
      })

      const hrend = process.hrtime(hrstart)

      console.log(`Inserted ${tokens.length} tokens on ${chain.id} in %ds %dms`, hrend[0], hrend[1] / 1000000)
    }
  } catch (e) {
    console.log('Failed to insert missing tokens', e)
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
