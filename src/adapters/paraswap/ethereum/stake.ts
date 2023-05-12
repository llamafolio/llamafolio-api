import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getTotalRewardsBalance: {
    inputs: [{ internalType: 'address', name: 'staker', type: 'address' }],
    name: 'getTotalRewardsBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const PSP: Token = {
  chain: 'ethereum',
  address: '0xcafe001067cdef266afb7eb5a286dcfd277f3de5',
  symbol: 'PSP',
  decimals: 18,
}

export async function getParaspaceBPTStakeBalances(
  ctx: BalancesContext,
  staker: Contract,
): Promise<Balance | undefined> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) {
    return
  }

  const [balance, { output: totalSupply }, { output: underlyingsBalancesAmount }] = await Promise.all([
    getSingleStakeBalance(ctx, staker),
    call({ ctx, target: staker.token!, abi: erc20Abi.totalSupply }),
    call({ ctx, target: staker.vault, params: [staker.poolId], abi: abi.getPoolTokens }),
  ])

  const fmtUnderlyings = underlyings.map((underlying, idx) => {
    const underlyingsAmount = BigNumber.from(underlyingsBalancesAmount.balances[idx])
      .mul(balance.amount)
      .div(totalSupply)

    return { ...underlying, amount: underlyingsAmount }
  })

  return { ...balance, underlyings: fmtUnderlyings }
}

export async function getParaspaceBPTFarmBalances(
  ctx: BalancesContext,
  farmer: Contract,
): Promise<Balance | undefined> {
  const underlyings = farmer.underlyings as Contract[]
  if (!underlyings) {
    return
  }

  const [balance, { output: totalSupply }, { output: underlyingsBalancesAmount }, { output: pendingReward }] =
    await Promise.all([
      getSingleStakeBalance(ctx, farmer),
      call({ ctx, target: farmer.token!, abi: erc20Abi.totalSupply }),
      call({ ctx, target: farmer.vault, params: [farmer.poolId], abi: abi.getPoolTokens }),
      call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.getTotalRewardsBalance }),
    ])

  const fmtUnderlyings = underlyings.map((underlying, idx) => {
    const underlyingsAmount = BigNumber.from(underlyingsBalancesAmount.balances[idx])
      .mul(balance.amount)
      .div(totalSupply)

    return { ...underlying, amount: underlyingsAmount }
  })

  return {
    ...balance,
    underlyings: fmtUnderlyings,
    rewards: [{ ...PSP, amount: BigNumber.from(pendingReward) }],
    category: 'farm',
  }
}
