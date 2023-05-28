import '../environment'

import { chains as tokensByChain } from '@llamafolio/tokens'

import type { BalancesContext } from '../src/lib/adapter'
import { sliceIntoChunks } from '../src/lib/array'
import type { Chain } from '../src/lib/chains'
import { multicall } from '../src/lib/multicall'

// See: https://github.com/o-az/evm-balances/tree/master
const multiCoinContracts = {
  arbitrum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  avalanche: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  bsc: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  ethereum: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  fantom: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  optimism: '0x7B1DB2CfCdd3DBd38d3700310CA3c76e94799081',
  polygon: '0xE052Ef907f09c0053B237647aD7387D4BDF11A5A',
}

const abi = {
  getBalances: {
    inputs: [
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'address[]',
        name: 'tokens',
        type: 'address[]',
      },
    ],
    name: 'getBalances',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

function help() {
  console.log('npm run multi-balanceOf {chain} {address}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: multi-balanceOf.ts
  // argv[2]: chain
  // argv[3]: address
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chain = process.argv[2] as Chain
  const address = process.argv[3].toLowerCase() as `0x${string}`

  const ctx: BalancesContext = { chain, adapterId: '', address }

  try {
    const hrstart = process.hrtime()

    const batchSize = 1000
    const tokens = tokensByChain[chain]
    const slices = sliceIntoChunks(tokens, batchSize)

    let errorsCount = 0

    const balances = await multicall({
      ctx,
      // @ts-ignore
      calls: slices.map((tokens) => ({
        target: multiCoinContracts[chain as keyof typeof multiCoinContracts],
        params: [ctx.address, tokens.map((token) => token.address)],
      })),
      abi: abi.getBalances,
    })

    let callIdx = 0
    for (let sliceIdx = 0; sliceIdx < slices.length; sliceIdx++) {
      const balancesSlice = balances[sliceIdx]
      if (!balancesSlice.success) {
        console.error(
          `Could not get balanceOf for tokens ${ctx.chain}:`,
          slices[sliceIdx].map((token) => token.address),
        )
        errorsCount += slices[sliceIdx].length
        continue
      }

      for (let tokenIdx = 0; tokenIdx < slices[sliceIdx].length; tokenIdx++) {
        const token = tokens[callIdx]
        token.amount = balancesSlice.output[tokenIdx] || 0n
        callIdx++
      }
    }

    const hrend = process.hrtime(hrstart)

    console.table(
      tokens
        .filter((token) => token.amount && token.amount > 0n)
        .map((token) => ({
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          amount: token.amount.toString(),
        })),
    )

    console.log(
      `balanceOf ${tokens.length} tokens, batchSize ${batchSize}, errors: ${errorsCount} in %ds %dms`,
      hrend[0],
      hrend[1] / 1000000,
    )
  } catch (e) {
    console.log('Failed to test multi-balanceOf', e)
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
