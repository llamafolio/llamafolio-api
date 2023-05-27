import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const LON: Token = {
  chain: 'ethereum',
  address: '0x0000000000095413afC295d19EDeb1Ad7B71c952',
  decimals: 18,
  symbol: 'LON',
}

export async function getLONFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, earnedsRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] } as const)),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] } as const)),
      abi: abi.earned,
    }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const balanceOfRes = balanceOfsRes[farmerIdx]
    const earnedRes = earnedsRes[farmerIdx]

    if (!balanceOfRes.success || !earnedRes.success || !farmer.token) {
      continue
    }

    balances.push({
      ...farmer,
      address: farmer.token,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: farmer.underlyings as Contract[],
      rewards: [{ ...LON, amount: BigNumber.from(earnedRes.output) }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
