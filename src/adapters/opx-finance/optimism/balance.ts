import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableReward: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'claimableReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getRedemptionCollateral: {
    inputs: [{ internalType: 'address', name: '_token', type: 'address' }],
    name: 'getRedemptionCollateral',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const OPX: Contract = {
  chain: 'optimism',
  address: '0xcdb4bb51801a1f399d4402c61bc098a72c382e65',
  decimals: 18,
  symbol: 'OPX',
}

const ETH: Contract = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000006',
  decimals: 18,
  symbol: 'ETH',
}

export async function getOlpStakeBalance(
  ctx: BalancesContext,
  olp: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  const underlyings = olp.underlyings as Contract[]
  if (!underlyings) return

  const [userShare, pendingEth, pendingOPX] = await Promise.all([
    call({ ctx, target: olp.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: olp.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: olp.address, params: [ctx.address], abi: abi.claimableReward }),
  ])

  const rewards = [
    { ...ETH, amount: pendingEth },
    { ...OPX, amount: pendingOPX },
  ]

  const stakeBalance: Balance = { ...olp, amount: userShare, underlyings, rewards, category: 'stake' }
  return getUnderlyingsBalances(ctx, stakeBalance, vault)
}

export async function getUnderlyingsBalances(
  ctx: BalancesContext,
  glpBalance: Balance,
  vault: Contract,
): Promise<Balance | undefined> {
  const rawUnderlyings = glpBalance.underlyings as Contract[]
  if (!rawUnderlyings) return

  const [underlyingsRedemptions, totalSupply] = await Promise.all([
    multicall({
      ctx,
      calls: rawUnderlyings.map((underlying) => ({ target: vault.address, params: [underlying.address] }) as const),
      abi: abi.getRedemptionCollateral,
    }),
    call({ ctx, target: glpBalance.address, abi: erc20Abi.totalSupply }),
  ])

  const underlyings = mapSuccessFilter(underlyingsRedemptions, (res, index) => {
    const underlying = rawUnderlyings[index]
    return { ...underlying, amount: (res.output * glpBalance.amount) / totalSupply }
  })

  return { ...glpBalance, underlyings }
}
