import { Balance, BalancesContext, BaseContext, Contract, RewardBalance } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  UNDERLYING_ASSET_ADDRESS: {
    inputs: [],
    name: 'UNDERLYING_ASSET_ADDRESS',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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
}

export interface GetMultiFeeDistributionBalancesParams {
  lendingPool: Contract
  multiFeeDistribution: Contract
  stakingToken: Token
}

export async function getMultiFeeDistributionContracts(
  ctx: BaseContext,
  multiFeeDistribution: Contract,
  stakingToken: Contract,
): Promise<Contract> {
  const { output: claimableRewards } = await call({
    ctx,
    target: multiFeeDistribution.address,
    // any addresses could return reward addresses
    params: [multiFeeDistribution.address],
    abi: abi.claimableRewards,
  })

  const underlyingsTokensRes = await multicall({
    ctx,
    calls: claimableRewards.map((reward: { token: string; amount: string }) => ({ target: reward.token })),
    abi: abi.UNDERLYING_ASSET_ADDRESS,
  })

  return {
    ...stakingToken,
    address: multiFeeDistribution.address,
    token: stakingToken.address,
    underlyings: underlyingsTokensRes.filter(isSuccess).map((token) => token.output),
    rewards: underlyingsTokensRes.filter(isSuccess).map((token) => token.input.target),
  }
}

export async function getMultiFeeDistributionBalances(
  ctx: BalancesContext,
  multiFeeDistributionContract: Contract,
  params: GetMultiFeeDistributionBalancesParams,
): Promise<Balance[] | undefined> {
  const balances: Balance[] = []

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

  const calls: Call[] = rewards.map((token) => ({ target: contract.address, params: token.address }))

  const [
    { output: claimableRewards },
    { output: lockedBalances },
    { output: earnedBalances },
    { output: unlockableBalance },
    { output: totalSupplyRes },
    rewardRatesRes,
  ] = await Promise.all([
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.claimableRewards }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.earnedBalances }),
    call({ ctx, target: params.multiFeeDistribution.address, params: [ctx.address], abi: abi.unlockedBalance }),
    call({ ctx, target: params.multiFeeDistribution.address, abi: erc20Abi.totalSupply }),
    multicall({ ctx, calls, abi: abi.rewardData }),
  ])

  // Locker
  for (let lockIdx = 0; lockIdx < lockedBalances.lockData.length; lockIdx++) {
    const lockedBalance = lockedBalances.lockData[lockIdx]
    const { amount, unlockTime } = lockedBalance

    balances.push({
      chain: ctx.chain,
      address: contract.token!,
      symbol: contract.symbol,
      decimals: contract.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: BigNumber.from(amount),
      unlockAt: unlockTime,
      category: 'lock',
    })
  }

  // Vester
  for (let vestIdx = 0; vestIdx < earnedBalances.earningsData.length; vestIdx++) {
    const earnedBalance = earnedBalances.earningsData[vestIdx]
    const { amount, unlockTime } = earnedBalance

    balances.push({
      chain: ctx.chain,
      address: stakingToken.address,
      symbol: stakingToken.symbol,
      decimals: stakingToken.decimals,
      underlyings: undefined,
      rewards: undefined,
      amount: BigNumber.from(amount),
      unlockAt: unlockTime,
      category: 'vest',
    })
  }

  // Staker
  balances.push({
    chain: ctx.chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: contract.decimals,
    underlyings: undefined,
    rewards: undefined,
    amount: BigNumber.from(unlockableBalance),
    category: 'stake',
  })

  for (let claimableIdx = 0; claimableIdx < rewards.length; claimableIdx++) {
    const rewardData = claimableRewards[claimableIdx]
    const rewardRate = rewardRatesRes[claimableIdx]
    const token = tokenByAddress[rewardData.token.toLowerCase()]

    if (!token || !rewardData || !isSuccess(rewardRate)) {
      continue
    }

    // let apy =  (604800 * (rData.rewardRate / decimal) * assetPrice * 365 / 7  /(geistPrice * totalSupply /1e18));

    const rewardBalance: RewardBalance = {
      chain: ctx.chain,
      address: rewardData.token,
      amount: BigNumber.from(rewardData.amount),
      underlyings: token.underlyings as Contract[],
      decimals: token.decimals,
      symbol: token.symbol,
      category: 'reward',
      rates: {
        rate: rewardRate.output.rewardRate,
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
