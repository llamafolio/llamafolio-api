import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccess, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

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
  tokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'tokens',
    outputs: [
      { internalType: 'address', name: 'pool', type: 'address' },
      { internalType: 'uint256', name: 'tranche', type: 'uint256' },
      { internalType: 'uint256', name: 'principalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'principalRedeemed', type: 'uint256' },
      { internalType: 'uint256', name: 'interestRedeemed', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  availableToWithdraw: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'availableToWithdraw',
    outputs: [
      { internalType: 'uint256', name: 'interestRedeemable', type: 'uint256' },
      { internalType: 'uint256', name: 'principalRedeemable', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  withdrawalRequest: {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'withdrawalRequest',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'epochCursor', type: 'uint256' },
          { internalType: 'uint256', name: 'usdcWithdrawable', type: 'uint256' },
          { internalType: 'uint256', name: 'fiduRequested', type: 'uint256' },
        ],
        internalType: 'struct ISeniorPoolEpochWithdrawals.WithdrawalRequest',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalCapitalHeldBy: {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'totalCapitalHeldBy',
    outputs: [
      { internalType: 'uint256', name: 'eligibleAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type Ibalance = Balance & {
  pool: `0x${string}`
  tokenId: bigint
}

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

export async function getGoldFinchDepositBalances(ctx: BalancesContext, depositer: Contract): Promise<Balance[]> {
  const REQUEST_ADDRESS = '0x8481a6EbAf5c7DABc3F7e09e44A89531fd31F822'
  const [userNftLength, rate] = await Promise.all([
    call({ ctx, target: depositer.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    FiduToUSDC(ctx),
  ])

  const userTokensIdsRes = await multicall({
    ctx,
    calls: rangeBI(0n, userNftLength).map(
      (idx) => ({ target: depositer.address, params: [ctx.address, idx] }) as const,
    ),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensIdsRes, (res) => ({ target: REQUEST_ADDRESS, params: [res.output] }) as const),
    abi: abi.withdrawalRequest,
  })

  const balances: Balance[] = mapSuccessFilter(tokensRes, (res) => ({
    ...depositer,
    amount: (res.output.fiduRequested * rate) / parseEther('1.0'),
    decimals: 18,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}

export async function getGoldFinchStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balance, rate] = await Promise.all([getSingleStakeBalance(ctx, staker), FiduToUSDC(ctx)])
  return { ...balance, amount: (balance.amount * rate) / parseEther('1.0') }
}

export async function getGoldFinchNFTStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [nftLength, rate] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    FiduToUSDC(ctx),
  ])

  const tokenIdsRes = await multicall({
    ctx,
    calls: rangeBI(0n, nftLength).map((idx) => ({ target: staker.address, params: [ctx.address, idx] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const [tokenBalancesRes, tokenPendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccess(tokenIdsRes, (tokenId) => ({ target: staker.address, params: [tokenId.output] }) as const),
      abi: abi.stakedBalanceOf,
    }),
    multicall({
      ctx,
      calls: mapSuccess(tokenIdsRes, (tokenId) => ({ target: staker.address, params: [tokenId.output] }) as const),
      abi: abi.optimisticClaimable,
    }),
  ])

  for (let index = 0; index < nftLength; index++) {
    const tokenBalanceRes = tokenBalancesRes[index]
    const tokenPendingRewardRes = tokenPendingRewardsRes[index]

    if (!tokenBalanceRes.success || !tokenPendingRewardRes.success) {
      continue
    }

    balances.push({
      ...staker,
      amount: (tokenBalanceRes.output * rate) / parseEther('1.0'),
      decimals: 18,
      underlyings: undefined,
      rewards: [{ ...GFI, amount: tokenPendingRewardRes.output }],
      category: 'stake',
    })
  }

  return balances
}

export async function getGoldFinchNFTFarmBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[]> {
  const userNftLength = await call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const userTokensIdsRes = await multicall({
    ctx,
    calls: rangeBI(0n, userNftLength).map((idx) => ({ target: farmer.address, params: [ctx.address, idx] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokensRes = await multicall({
    ctx,
    calls: mapSuccessFilter(userTokensIdsRes, (res) => ({ target: farmer.address, params: [res.output] }) as const),
    abi: abi.tokens,
  })

  const balances: Ibalance[] = mapSuccessFilter(tokensRes, (res) => {
    const [pool, _, amount] = res.output

    return {
      ...farmer,
      amount,
      pool,
      underlyings: farmer.underlyings as Contract[],
      rewards: farmer.rewards as Balance[],
      tokenId: res.input.params[0],
      category: 'farm',
    }
  })

  const userRewardsRes = await multicall({
    ctx,
    calls: balances.map((balance) => ({ target: balance.pool, params: [balance.tokenId] }) as const),
    abi: abi.availableToWithdraw,
  })

  for (const [index, balance] of balances.entries()) {
    const userRewardRes = userRewardsRes[index]

    if (!userRewardRes.success) continue
    ;(balance.rewards as any) = [{ ...balance.rewards?.[0], amount: userRewardRes.output[0] }]
  }

  return balances
}

export async function getGFIBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [totalGFIHeldBy, totalUSDCHeldBy, pendingReward] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.totalGFIHeldBy }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.totalCapitalHeldBy }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const [eligibleGFIAmount] = totalGFIHeldBy
  const [eligibleUSDCAmount] = totalUSDCHeldBy

  balances.push(
    {
      ...GFI,
      amount: eligibleGFIAmount,
      underlyings: undefined,
      rewards: [{ ...GFI, amount: pendingReward }],
      category: 'farm',
    },
    {
      ...USDC,
      amount: eligibleUSDCAmount,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    },
  )

  return balances
}
