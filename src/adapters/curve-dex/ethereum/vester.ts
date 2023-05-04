import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  initial_locked: {
    name: 'initial_locked',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 1845,
  },
  total_claimed: {
    name: 'total_claimed',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 1875,
  },
  end_time: {
    name: 'end_time',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1661,
  },
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

export async function getVesterBalances(ctx: BalancesContext, vesters: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = vesters.map((vester) => ({ target: vester.address, params: [ctx.address] }))

  const [initialBalancesRes, claimedBalancesRes, balanceOfsRes, endTimesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.initial_locked }),
    multicall({ ctx, calls, abi: abi.total_claimed }),
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: vesters.map((vester) => ({ target: vester.address })), abi: abi.end_time }),
  ])

  for (let vesterIdx = 0; vesterIdx < vesters.length; vesterIdx++) {
    const vester = vesters[vesterIdx]
    const initialBalanceRes = initialBalancesRes[vesterIdx]
    const claimedBalanceRes = claimedBalancesRes[vesterIdx]
    const balanceOfRes = balanceOfsRes[vesterIdx]
    const endTimeRes = endTimesRes[vesterIdx]

    if (
      !isSuccess(initialBalanceRes) ||
      !isSuccess(claimedBalanceRes) ||
      !isSuccess(balanceOfRes) ||
      !isSuccess(endTimeRes)
    ) {
      continue
    }

    balances.push({
      ...vester,
      decimals: CRV.decimals,
      symbol: CRV.symbol,
      amount: BigNumber.from(initialBalanceRes.output).sub(claimedBalanceRes.output),
      claimable: BigNumber.from(balanceOfRes.output),
      unlockAt: endTimeRes.output,
      underlyings: [CRV],
      rewards: undefined,
      category: 'vest',
    })
  }

  return balances
}
