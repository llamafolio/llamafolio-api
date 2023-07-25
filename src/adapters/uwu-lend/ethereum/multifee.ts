import type { Balance, BalancesContext, Contract, RewardBalance } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'token', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        internalType: 'struct MultiFeeDistribution.RewardData[]',
        name: 'rewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  lockedBalances: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'lockedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      { internalType: 'uint256', name: 'unlockable', type: 'uint256' },
      { internalType: 'uint256', name: 'locked', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
        ],
        internalType: 'struct MultiFeeDistribution.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earnedBalances: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'earnedBalances',
    outputs: [
      { internalType: 'uint256', name: 'total', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
        ],
        internalType: 'struct MultiFeeDistribution.LockedBalance[]',
        name: 'earningsData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  unlockedBalance: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'unlockedBalance',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardData: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'rewardData',
    outputs: [
      { internalType: 'uint256', name: 'periodFinish', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardRate', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'lastUpdateTime',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'rewardPerTokenStored',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'balance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export interface GetMultiFeeDistributionBalancesParams {
  lendingPool: Contract
  multiFeeDistribution: Contract
  stakingToken: Token
}

const UwU: Token = {
  chain: 'ethereum',
  address: '0x55C08ca52497e2f1534B59E2917BF524D4765257',
  decimals: 18,
  symbol: 'UwU',
}

export async function getUWUMultiFeeDistributionBalances(
  ctx: BalancesContext,
  multiFeeDistributionContract: Contract,
  params: GetMultiFeeDistributionBalancesParams,
) {
  const balances: Balance[] = []
  const lockerBalances: Balance[] = []

  const contract = multiFeeDistributionContract

  const stakingToken = params.stakingToken
  const rewards = contract.rewards as Contract[]

  const underlyings = contract.underlyings as Contract[]

  if (!contract || !rewards) {
    return
  }

  const tokens: Contract[] = rewards.map((reward, tokenIdx) => {
    return {
      ...reward,
      underlyings: underlyings[tokenIdx] ? [underlyings[tokenIdx]] : undefined,
    }
  })

  const tokenByAddress = keyBy(tokens, 'address', { lowercase: true })

  const [claimableRewards, lockedBalances, earnedBalances, totalSupplyRes, rewardRatesRes] = await Promise.all([
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.claimableRewards }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.earnedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: rewards.map((token) => ({ target: contract.address, params: [token.address] }) as const),
      abi: abi.rewardData,
    }),
  ])
  const [_lockedTotal, unlockable, _locked, lockData] = lockedBalances
  const [_earnedTotal, earningsData] = earnedBalances

  // Locker
  for (let lockIdx = 0; lockIdx < lockData.length; lockIdx++) {
    const lockedBalance = lockData[lockIdx]
    const underlyingsFromToken = (stakingToken as Contract).underlyings
    const { amount, unlockTime } = lockedBalance

    lockerBalances.push({
      chain: ctx.chain,
      address: contract.token!,
      symbol: contract.symbol,
      decimals: contract.decimals,
      underlyings: underlyingsFromToken as Contract[],
      rewards: undefined,
      amount: amount,
      claimable: unlockTime < Date.now() ? unlockable : 0n,
      unlockAt: Number(unlockTime),
      category: 'lock',
    })
  }

  balances.push(...(await getUnderlyingBalances(ctx, lockerBalances)))

  // Vester
  for (let vestIdx = 0; vestIdx < earningsData.length; vestIdx++) {
    const earnedBalance = earningsData[vestIdx]
    const { amount, unlockTime } = earnedBalance

    balances.push({
      chain: ctx.chain,
      address: UwU.address,
      symbol: UwU.symbol,
      decimals: UwU.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: amount,
      unlockAt: Number(unlockTime),
      category: 'vest',
    })
  }

  for (let claimableIdx = 0; claimableIdx < rewards.length; claimableIdx++) {
    const rewardData = claimableRewards[claimableIdx]
    const rewardRateRes = rewardRatesRes[claimableIdx]
    const token = tokenByAddress[rewardData.token.toLowerCase()]

    if (!token || !rewardData || !rewardRateRes.success) {
      continue
    }

    const [_periodFinish, rewardRate] = rewardRateRes.output

    // let apy =  (604800 * (rData.rewardRate / decimal) * assetPrice * 365 / 7  /(geistPrice * totalSupply /1e18));

    const rewardBalance: RewardBalance = {
      chain: ctx.chain,
      address: rewardData.token,
      amount: rewardData.amount,
      underlyings: token.underlyings as Contract[],
      decimals: token.decimals,
      symbol: token.symbol,
      category: 'reward',
      rates: {
        rate: rewardRate,
        period: 604800,
        token: rewardData.token,
        decimals: token.decimals,
        symbol: token.symbol,
        //below is the token that you stake or lock to receive the above reward, it is required to calculate an APR
        stakedToken: params.stakingToken.address,
        stakedSymbol: params.stakingToken.symbol,
        stakedDecimals: params.stakingToken.decimals,
        stakedSupply: totalSupplyRes,
      },
    }

    balances.push(rewardBalance)
  }

  return balances
}
