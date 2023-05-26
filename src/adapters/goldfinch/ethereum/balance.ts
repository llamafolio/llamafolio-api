import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

const abi = {
  sharePrice: {
    inputs: [],
    name: 'sharePrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  optimisticClaimable: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'optimisticClaimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakedBalanceOf: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'stakedBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'claimableRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalGFIHeldBy: {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'totalGFIHeldBy',
    outputs: [
      { internalType: 'uint256', name: 'eligibleAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const GFI: Token = {
  chain: 'ethereum',
  address: '0xdab396ccf3d84cf2d07c4454e10c8a6f5b008d2b',
  symbol: 'GFI',
  decimals: 18,
}

const USDC: Token = {
  chain: 'ethereum',
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
}

const FiduToUSDC = async (ctx: BalancesContext) => {
  const RATE_ADDRESS = '0x8481a6EbAf5c7DABc3F7e09e44A89531fd31F822'
  return call({ ctx, target: RATE_ADDRESS, abi: abi.sharePrice })
}

export async function getGoldFinchStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balance, rate] = await Promise.all([getSingleStakeBalance(ctx, staker), FiduToUSDC(ctx)])

  return {
    ...balance,
    amount: balance.amount.mul(rate).div(utils.parseEther('1.0')),
  }
}

export async function getGoldFinchNFTStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [nftLength, rate] = await Promise.all([
    call({
      ctx,
      target: staker.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    FiduToUSDC(ctx),
  ])

  const tokenIdsRes = await multicall({
    ctx,
    calls: range(0, Number(nftLength)).map((idx) => ({ target: staker.address, params: [ctx.address, idx] })),
    abi: abi.tokenOfOwnerByIndex,
  })

  const [tokenBalancesRes, tokenPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: tokenIdsRes.map((tokenId) =>
        isSuccess(tokenId) ? { target: staker.address, params: [tokenId.output] } : null,
      ),
      abi: abi.stakedBalanceOf,
    }),
    multicall({
      ctx,
      calls: tokenIdsRes.map((tokenId) =>
        isSuccess(tokenId) ? { target: staker.address, params: [tokenId.output] } : null,
      ),
      abi: abi.optimisticClaimable,
    }),
  ])

  for (let index = 0; index < nftLength; index++) {
    const tokenBalanceRes = tokenBalancesRes[index]
    const tokenPendingRewardRes = tokenPendingRewardsRes[index]

    if (!isSuccess(tokenBalanceRes) || !isSuccess(tokenPendingRewardRes)) {
      continue
    }

    const underlyingsAmount = BigNumber.from(tokenBalanceRes.output).mul(rate).div(utils.parseEther('1.0'))

    balances.push({
      ...staker,
      amount: BigNumber.from(tokenBalanceRes.output),
      underlyings: [{ ...USDC, decimals: 18, amount: underlyingsAmount }],
      rewards: [{ ...GFI, amount: BigNumber.from(tokenPendingRewardRes.output) }],
      category: 'stake',
    })
  }

  return balances
}

export async function getGFIFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const [totalGFIHeldBy, pendingReward] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.totalGFIHeldBy }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const [eligibleAmount, _totalAmount] = totalGFIHeldBy

  return {
    ...farmer,
    amount: BigNumber.from(eligibleAmount),
    underlyings: [GFI],
    rewards: [{ ...GFI, amount: BigNumber.from(pendingReward) }],
    category: 'farm',
  }
}
