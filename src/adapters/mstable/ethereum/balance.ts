import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getSingleLockerBalance } from '@lib/lock'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

const abi = {
  exchangeRate: {
    constant: true,
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  getBassets: {
    inputs: [],
    name: 'getBassets',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'addr', type: 'address' },
          { internalType: 'address', name: 'integrator', type: 'address' },
          { internalType: 'bool', name: 'hasTxFee', type: 'bool' },
          { internalType: 'enum MassetStructs.BassetStatus', name: 'status', type: 'uint8' },
        ],
        internalType: 'struct MassetStructs.BassetPersonal[]',
        name: 'personal',
        type: 'tuple[]',
      },
      {
        components: [
          { internalType: 'uint128', name: 'ratio', type: 'uint128' },
          { internalType: 'uint128', name: 'vaultBalance', type: 'uint128' },
        ],
        internalType: 'struct MassetStructs.BassetData[]',
        name: 'data',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rawBalanceOf: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'rawBalanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  unclaimedRewards: {
    constant: true,
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'unclaimedRewards',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'first', type: 'uint256' },
      { internalType: 'uint256', name: 'last', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  stakeEarned: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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
  locked: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'locked',
    outputs: [
      { internalType: 'int128', name: 'amount', type: 'int128' },
      { internalType: 'uint256', name: 'end', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getmStableBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const userBalanceOfRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] } as const)),
    abi: erc20Abi.balanceOf,
  })

  const balances: Balance[] = mapSuccessFilter(userBalanceOfRes, (res, idx) => ({
    ...pools[idx],
    amount: BigNumber.from(res.output),
    underlyings: pools[idx].underlyings as Contract[],
    rewards: undefined,
    category: 'lp',
  }))

  return getmStableUnderlyings(ctx, balances)
}

export async function getmStableFarmingBalances(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const [userBalance, exchangeRate, unclaimedRewards] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.rawBalanceOf }),
    call({ ctx, target: farmer.token!, abi: abi.exchangeRate }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.unclaimedRewards }),
  ])
  const [amount, _first, _last] = unclaimedRewards

  const fmtUnderlyings = {
    ...(farmer.underlyings?.[0] as Contract),
    amount: BigNumber.from(userBalance).mul(exchangeRate).div(utils.parseEther('1.0')),
  }

  return {
    ...farmer,
    amount: BigNumber.from(userBalance),
    underlyings: [fmtUnderlyings],
    rewards: [{ ...(farmer.rewards?.[0] as Contract), amount: BigNumber.from(amount) }],
    category: 'farm',
  }
}

export async function getstkMTABalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, pendingReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakeEarned }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(userBalance),
    underlyings: staker.underlyings as Contract[],
    rewards: [{ ...(staker.rewards?.[0] as Contract), amount: BigNumber.from(pendingReward) }],
    category: 'stake',
  }
}

export async function getstkBPTBalance(ctx: BalancesContext, staker: Contract): Promise<Balance | undefined> {
  const underlyings = staker.underlyings as Contract[]
  if (!underlyings) {
    return
  }

  const [userBalanceOf, pendingReward, poolTokens, totalSuppliesRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakeEarned }),
    call({ ctx, target: staker.vault, params: [staker.poolId], abi: abi.getPoolTokens }),
    call({ ctx, target: staker.address, abi: erc20Abi.totalSupply }),
  ])
  const [_tokens, balances, _lastChangeBlock] = poolTokens

  underlyings.forEach((underlying, idx) => {
    const underlyingAmount = BigNumber.from(balances[idx]).mul(userBalanceOf).div(totalSuppliesRes)

    underlying.amount = underlyingAmount
  })

  return {
    ...staker,
    amount: BigNumber.from(userBalanceOf),
    underlyings,
    rewards: [{ ...(staker.rewards?.[0] as Contract), amount: BigNumber.from(pendingReward) }],
    category: 'stake',
  }
}

export async function getmStableLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const underlying = locker.underlyings?.[0] as Token
  const [userBalanceRes, userRewardRes] = await Promise.all([
    getSingleLockerBalance(ctx, locker, underlying, 'locked'),
    call({ ctx, target: locker.address, params: [ctx.address], abi: abi.stakeEarned }),
  ])

  userBalanceRes.rewards = [{ ...(locker.rewards?.[0] as Contract), amount: BigNumber.from(userRewardRes) }]

  return {
    ...userBalanceRes,
  }
}

const getmStableUnderlyings = async (ctx: BalancesContext, balances: Balance[]): Promise<Balance[]> => {
  const singleUnderlyingsPoolBalances: Balance[] = []
  const multipleUnderlyingsPoolBalances: Balance[] = []
  const multiplePoolBalances: Balance[] = []

  for (const balance of balances) {
    if (balance.underlyings && balance.underlyings.length > 1) {
      multipleUnderlyingsPoolBalances.push(balance)
    } else {
      singleUnderlyingsPoolBalances.push(balance)
    }
  }

  const [singleUnderlyingsBalancesRes, multipleUnderlyingsBalances, totalSuppliesRes] = await Promise.all([
    multicall({
      ctx,
      calls: singleUnderlyingsPoolBalances.map((pool) => ({ target: pool.address })),
      abi: abi.exchangeRate,
    }),
    multicall({
      ctx,
      calls: multipleUnderlyingsPoolBalances.map((pool) => ({ target: pool.address })),
      abi: abi.getBassets,
    }),
    multicall({
      ctx,
      calls: multipleUnderlyingsPoolBalances.map((pool) => ({ target: pool.address })),
      abi: erc20Abi.totalSupply,
    }),
  ])

  const singlePoolBalances: Balance[] = mapSuccessFilter(singleUnderlyingsBalancesRes, (res, idx) => {
    const poolBalance = singleUnderlyingsPoolBalances[idx]
    const fmtUnderlyings = {
      ...poolBalance.underlyings?.[0],
      amount: poolBalance.amount.mul(res.output).div(utils.parseEther('1.0')),
    }

    return {
      ...poolBalance,
      amount: poolBalance.amount,
      underlyings: [fmtUnderlyings as Contract],
      rewards: undefined,
      category: poolBalance.category,
    }
  })

  for (let poolIdx = 0; poolIdx < multipleUnderlyingsPoolBalances.length; poolIdx++) {
    const poolBalance = multipleUnderlyingsPoolBalances[poolIdx]
    const underlyings = poolBalance.underlyings as Contract[]
    const multipleUnderlyingBalance = multipleUnderlyingsBalances[poolIdx]
    const totalSupplyRes = totalSuppliesRes[poolIdx]

    if (!underlyings || !multipleUnderlyingBalance.success || !totalSupplyRes.success || totalSupplyRes.output === 0n) {
      continue
    }

    const [_personal, data] = multipleUnderlyingBalance.output

    const fmtUnderlyings = underlyings.map((underlying, idx) => ({
      ...underlying,
      amount: poolBalance.amount.mul(data[idx].vaultBalance).div(totalSupplyRes.output),
    }))

    multiplePoolBalances.push({
      ...poolBalance,
      amount: poolBalance.amount,
      underlyings: fmtUnderlyings,
      rewards: undefined,
      category: poolBalance.category,
    })
  }

  return [...singlePoolBalances, ...multiplePoolBalances]
}
