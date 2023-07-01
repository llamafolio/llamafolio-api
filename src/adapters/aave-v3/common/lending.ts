import type { Balance, BalancesContext, BaseBalance, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { getBalancesOf } from '@lib/erc20'
import { MAX_UINT_256 } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { formatUnits } from 'viem'

const abi = {
  getReservesList: {
    inputs: [],
    name: 'getReservesList',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserveTokensAddresses: {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'getReserveTokensAddresses',
    outputs: [
      { internalType: 'address', name: 'aTokenAddress', type: 'address' },
      {
        internalType: 'address',
        name: 'stableDebtTokenAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'variableDebtTokenAddress',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserAccountData: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserAccountData',
    outputs: [
      {
        internalType: 'uint256',
        name: 'totalCollateralBase',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'totalDebtBase', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'availableBorrowsBase',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'currentLiquidationThreshold',
        type: 'uint256',
      },
      { internalType: 'uint256', name: 'ltv', type: 'uint256' },
      { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getAllUserRewards: {
    inputs: [
      { internalType: 'address[]', name: 'assets', type: 'address[]' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getAllUserRewards',
    outputs: [
      {
        internalType: 'address[]',
        name: 'rewardsList',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'unclaimedAmounts',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getUserRewards: {
    inputs: [
      {
        internalType: 'address[]',
        name: 'assets',
        type: 'address[]',
      },
      {
        internalType: 'address',
        name: 'user',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'reward',
        type: 'address',
      },
    ],
    name: 'getUserRewards',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendingPoolContracts(
  ctx: BaseContext,
  lendingPool: Contract,
  poolDataProvider: Contract,
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const reservesList = await call({
    ctx,
    target: lendingPool.address,
    abi: abi.getReservesList,
  })

  const reserveTokensAddressesRes = await multicall({
    ctx,
    calls: reservesList.map((address) => ({ target: poolDataProvider.address, params: [address] } as const)),
    abi: abi.getReserveTokensAddresses,
  })

  for (let reserveIdx = 0; reserveIdx < reserveTokensAddressesRes.length; reserveIdx++) {
    const reserveTokensAddressRes = reserveTokensAddressesRes[reserveIdx]
    if (!reserveTokensAddressRes.success) {
      continue
    }

    const underlyingToken = reserveTokensAddressRes.input.params[0]
    const [aToken, stableDebtToken, variableDebtToken] = reserveTokensAddressRes.output

    contracts.push(
      {
        chain: ctx.chain,
        address: aToken,
        underlyings: [underlyingToken],
        category: 'lend',
      },
      {
        chain: ctx.chain,
        address: stableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: true,
      },
      {
        chain: ctx.chain,
        address: variableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: false,
      },
    )
  }

  return contracts
}

export async function getLendingPoolBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances = await getBalancesOf(ctx, contracts as Token[])

  // use the same amount for underlyings
  for (const balance of balances) {
    if (balance.amount > 0n && balance.underlyings) {
      ;(balance.underlyings[0] as BaseBalance).amount = balance.amount
    }
  }

  return balances
}

export async function getLendingRewardsBalances(
  ctx: BalancesContext,
  incentiveController: Contract,
): Promise<Balance[]> {
  const rewards: Balance[] = []
  const assets: `0x${string}`[] = incentiveController.pools.map((pool: Contract) => pool.address)

  const rewardsList = incentiveController.rewards as Contract[] | undefined
  if (!rewardsList || rewardsList.length === 0) {
    return []
  }

  const pendingRewardsRes = await Promise.all(
    rewardsList.map(async (reward) => {
      const calls: Call<typeof abi.getUserRewards>[] = assets.map((asset) => ({
        target: incentiveController.address,
        params: [[asset], ctx.address, reward.address],
      }))

      return multicall({
        ctx,
        calls,
        abi: abi.getUserRewards,
      })
    }),
  )

  const totalRewardsList = pendingRewardsRes.map((res) => mapSuccessFilter(res, (result) => result.output))

  for (let i = 0; i < rewardsList.length; i++) {
    const reward = rewardsList[i]
    const totalRewards = totalRewardsList[i].reduce((acc, curr) => acc + curr, 0n)

    rewards.push({
      ...reward,
      amount: totalRewards,
      underlyings: undefined,
      rewards: undefined,
      category: 'reward',
    })
  }

  return rewards
}

export async function getLendingPoolHealthFactor(ctx: BalancesContext, lendingPool: Contract) {
  const [
    _totalCollateralBase,
    _totalDebtBase,
    _availableBorrowsBase,
    _currentLiquidationThreshold,
    _ltv,
    healthFactor,
  ] = await call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.getUserAccountData })

  // no borrowed balance
  if (healthFactor === MAX_UINT_256) {
    return
  }

  const healthFactorFloat = parseFloat(formatUnits(healthFactor, 18))

  // TODO: return other metadata like LTV, available borrow etc
  return healthFactorFloat
}
