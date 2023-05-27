import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      { internalType: 'uint256', name: 'amount0Current', type: 'uint256' },
      { internalType: 'uint256', name: 'amount1Current', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const Lyra: Token = {
  chain: 'ethereum',
  address: '0x01BA67AAC7f75f647D94220Cc98FB30FCc5105Bf',
  decimals: 18,
  symbol: 'LYRA',
}

export async function getLyraFarmBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof erc20Abi.balanceOf>[] = contracts.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }))
  const arrakisCalls: Call<typeof erc20Abi.totalSupply>[] = contracts.map((contract) => ({ target: contract.lpToken }))

  const [balanceOfsRes, earnedsRes, totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
    multicall({ ctx, calls: arrakisCalls, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls: arrakisCalls, abi: abi.getUnderlyingBalances }),
  ])

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const underlyings = contract.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[idx]
    const earnedRes = earnedsRes[idx]
    const totalSupplyRes = totalSuppliesRes[idx]
    const underlyingsBalanceRes = underlyingsBalancesRes[idx]

    if (
      !balanceOfRes.success ||
      !earnedRes.success ||
      !totalSupplyRes.success ||
      !underlyingsBalanceRes.success ||
      !underlyings
    ) {
      continue
    }

    const [amount0Current, amount1Current] = underlyingsBalanceRes.output

    balances.push({
      ...contract,
      decimals: 18,
      symbol: `${underlyings[0].symbol} + ${underlyings[1].symbol}`,
      amount: BigNumber.from(balanceOfRes.output),
      underlyings: [
        {
          ...underlyings[0],
          amount: BigNumber.from(balanceOfRes.output).mul(amount0Current).div(totalSupplyRes.output),
        },
        {
          ...underlyings[1],
          amount: BigNumber.from(balanceOfRes.output).mul(amount1Current).div(totalSupplyRes.output),
        },
      ],
      rewards: [{ ...Lyra, amount: BigNumber.from(earnedRes.output) }],
      category: 'farm',
    })
  }

  return balances
}
