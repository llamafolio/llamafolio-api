import '../environment'

import fs from 'node:fs'

import type { BaseContext } from '@lib/adapter'
import { getRPCClient } from '@lib/chains'
import { abi } from '@lib/erc20'
import { type Call, multicall } from '@lib/multicall'

const addresses: `0x${string}`[] = []

function help() {
  console.log('pnpm run get-tokens')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: get-tokens.ts
  if (process.argv.length < 2) {
    console.error('Missing arguments')
    return help()
  }

  const ctx: BaseContext = { chain: 'ethereum', adapterId: '', client: getRPCClient({ chain: 'ethereum' }) }

  const calls: Call<typeof abi.symbol>[] = addresses.map((address) => ({ target: address }))

  const tokens: any[] = []

  try {
    const [names, symbols, decimals] = await Promise.all([
      multicall({ ctx, calls, abi: abi.name }),
      multicall({ ctx, calls, abi: abi.symbol }),
      multicall({ ctx, calls, abi: abi.decimals }),
    ])

    for (let i = 0; i < calls.length; i++) {
      const address = addresses[i]
      const nameRes = names[i]
      const decimalsRes = decimals[i]
      const symbolRes = symbols[i]

      if (!nameRes.success) {
        console.error(`Could not get name for token ${ctx.chain}:${address}`)
        continue
      }
      if (!decimalsRes.success) {
        console.error(`Could not get decimals for token ${ctx.chain}:${address}`)
        continue
      }
      if (!symbolRes.success) {
        console.error(`Could not get symbol for token ${ctx.chain}:${address}`)
        continue
      }

      tokens.push({
        address,
        name: nameRes.output,
        symbol: symbolRes.output,
        decimals: decimalsRes.output,
        stable: false,
      })
    }

    fs.writeFileSync('./tokens.json', JSON.stringify(tokens), 'utf8')
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
