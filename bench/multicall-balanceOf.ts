import '../environment'

import { chains as tokensByChain } from '@llamafolio/tokens'
import { BigNumber } from 'ethers'

import { BalancesContext } from '../src/lib/adapter'
import { Chain } from '../src/lib/chains'
import { multicall } from '../src/lib/multicall'

const abi = {
  balanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

function help() {
  console.log('npm run multicall-balanceOf {chain} {address}')
}

async function main() {
  // argv[0]: ts-node
  // argv[1]: multicall-balanceOf.ts
  // argv[2]: chain
  // argv[3]: address
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const chain = process.argv[2] as Chain
  const address = process.argv[3].toLowerCase()

  const ctx: BalancesContext = { chain, adapterId: '', address }

  try {
    const hrstart = process.hrtime()

    const tokens = tokensByChain[chain] as any[]

    let errorsCount = 0

    const balances = await multicall({
      ctx,
      calls: tokens.map((token) => ({
        target: token.address,
        params: [ctx.address],
      })),
      abi: abi.balanceOf,
    })

    for (let tokenIdx = 0; tokenIdx < tokens.length; tokenIdx++) {
      if (!balances[tokenIdx].success || balances[tokenIdx].output == null) {
        errorsCount++
        continue
      }
      const token = tokens[tokenIdx]
      token.amount = BigNumber.from(balances[tokenIdx].output || '0')
    }

    const hrend = process.hrtime(hrstart)

    console.table(
      tokens
        .filter((token) => token.amount && token.amount.gt(0))
        .map((token) => ({
          address: token.address,
          symbol: token.symbol,
          decimals: token.decimals,
          amount: token.amount.toString(),
        })),
    )

    console.log(`balanceOf ${tokens.length} tokens, errors: ${errorsCount} in %ds %dms`, hrend[0], hrend[1] / 1000000)
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
