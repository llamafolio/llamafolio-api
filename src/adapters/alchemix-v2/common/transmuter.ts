import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  accounts: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'accounts',
    outputs: [
      { internalType: 'int256', name: 'debt', type: 'int256' },
      { internalType: 'address[]', name: 'depositedTokens', type: 'address[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalValue: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'totalValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

interface getTransmutationBalancesParams extends Balance {
  reactiveToken: string
}

export async function getTransmutationBalances(
  ctx: BalancesContext,
  transmuters: Contract[],
  reactives: Contract[],
): Promise<Balance[]> {
  const synthetics: Balance[] = []

  const calls: Call[] = []
  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    calls.push({ target: transmuter.address, params: [ctx.address] })
  }

  const [accountsRes, totalValuesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.accounts }),
    multicall({ ctx, calls, abi: abi.totalValue }),
  ])

  const reactivesDetailsByAddress: { [key: string]: Contract } = {}
  for (const reactive of reactives) {
    reactivesDetailsByAddress[reactive.address.toLowerCase()] = reactive
  }

  for (let idx = 0; idx < transmuters.length; idx++) {
    const transmuter = transmuters[idx]
    const borrow = transmuter.underlyings?.[0]
    const accountRes = accountsRes[idx]
    const totalValueRes = totalValuesRes[idx]

    if (!isSuccess(accountRes) || !accountRes.output.depositedTokens[0]) {
      continue
    }

    const synthetic: getTransmutationBalancesParams = {
      ...(borrow as Contract),
      amount: BigNumber.from(accountRes.output.debt),
      reactiveToken: accountRes.output.depositedTokens[0].toLowerCase(),
      underlyings: undefined,
      rewards: undefined,
      category: 'borrow',
    }

    const reactiveDetails = reactivesDetailsByAddress[synthetic.reactiveToken.toLowerCase()]
    const underlyings = reactiveDetails.underlyings?.[0] as Contract

    if (!isSuccess(totalValueRes) || !underlyings) {
      continue
    }

    const reactive: Balance = {
      ...reactiveDetails,
      symbol: underlyings.symbol,
      amount: BigNumber.from(totalValueRes.output),
      underlyings: undefined,
      rewards: undefined,
      category: 'lend',
    }

    synthetics.push(synthetic, reactive)
  }
  return synthetics
}
