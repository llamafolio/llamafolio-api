import type { Balance, BalancesContext, BaseContext, BaseContract, Contract } from '@lib/adapter'
import { mapSuccessFilter, range, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  addressToPoolInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'addressToPoolInfo',
    outputs: [
      { internalType: 'address', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'accVTXPerShare', type: 'uint256' },
      { internalType: 'address', name: 'rewarder', type: 'address' },
      { internalType: 'address', name: 'helper', type: 'address' },
      { internalType: 'address', name: 'locker', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  depositInfo: {
    inputs: [
      { internalType: 'address', name: '_lp', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'depositInfo',
    outputs: [{ internalType: 'uint256', name: 'availableAmount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositToken: {
    inputs: [],
    name: 'depositToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingTokens: {
    inputs: [
      { internalType: 'address', name: '_lp', type: 'address' },
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address', name: 'token', type: 'address' },
    ],
    name: 'pendingTokens',
    outputs: [
      { internalType: 'uint256', name: 'pendingVTX', type: 'uint256' },
      { internalType: 'address', name: 'bonusTokenAddress', type: 'address' },
      { internalType: 'string', name: 'bonusTokenSymbol', type: 'string' },
      { internalType: 'uint256', name: 'pendingBonusToken', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  registeredToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [
      { internalType: 'address', name: '_account', type: 'address' },
      { internalType: 'address', name: '_rewardToken', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  token0: {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  token1: {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserves: {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: '_reserve0', type: 'uint112' },
      { internalType: 'uint112', name: '_reserve1', type: 'uint112' },
      { internalType: 'uint32', name: '_blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface FarmContract extends Contract {
  rewarder: `0x${string}`
}

type FarmBalance = Balance & {
  rewarder: `0x${string}`
}

const VTX: Token = {
  chain: 'avalanche',
  address: '0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4',
  decimals: 18,
  symbol: 'VTX',
}

export async function getFarmContracts(ctx: BaseContext, masterChef: Contract) {
  const contracts: FarmContract[] = []

  const poolsLength = await call({
    ctx,
    target: masterChef.address,
    abi: abi.poolLength,
  })

  const poolsAddressesRes = await multicall({
    ctx,
    calls: rangeBI(0n, poolsLength).map((i) => ({ target: masterChef.address, params: [i] }) as const),
    abi: abi.registeredToken,
  })

  const poolsAddresses = mapSuccessFilter(poolsAddressesRes, (res) => res.output)

  const poolInfosRes = await multicall({
    ctx,
    calls: poolsAddresses.map((pool) => ({ target: masterChef.address, params: [pool] }) as const),
    abi: abi.addressToPoolInfo,
  })

  const poolInfos = mapSuccessFilter(poolInfosRes, (res) => res)

  // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts checked, 7 seems to be the maximum number of extra tokens used.
  // However, this process forced us to encounter many multicall failures on contracts that do not have as many tokens
  const rewardsLength = 7

  const [depositTokensRes, rewardTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolInfos.map((res) => {
        const [_lpToken, _allocPoint, _lastRewardTimestamp, _accVTXPerShare, _rewarder, helper] = res.output
        return { target: helper }
      }),
      abi: abi.depositToken,
    }),

    multicall({
      ctx,
      calls: poolInfos.flatMap((res) => {
        const [_lpToken, _allocPoint, _lastRewardTimestamp, _accVTXPerShare, rewarder] = res.output
        return rangeBI(0n, BigInt(rewardsLength)).map((idx) => ({ target: rewarder, params: [idx] }) as const)
      }),
      abi: abi.rewardTokens,
    }),
  ])

  for (let poolIdx = 0; poolIdx < poolInfos.length; poolIdx++) {
    const poolInfoRes = poolInfos[poolIdx]
    const depositTokenRes = depositTokensRes[poolIdx]
    const [_lpToken, _allocPoint, _lastRewardTimestamp, _accVTXPerShare, rewarder] = poolInfoRes.output

    if (!depositTokenRes.success) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: poolInfoRes.input.params![0],
      rewarder: rewarder,
      underlyings: [depositTokenRes.output],
      rewards: mapSuccessFilter(
        range(poolIdx * rewardsLength, (poolIdx + 1) * rewardsLength).map((rewardIdx) => rewardTokensRes[rewardIdx]),
        (res) => res.output,
      ),
    })
  }

  return contracts
}

export async function getFarmBalances(
  ctx: BalancesContext,
  pools: FarmContract[],
  masterChef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userDepositBalancesRes, pendingBaseRewardsRes, pendingRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: masterChef.address, params: [pool.address, ctx.address] }) as const),
      abi: abi.depositInfo,
    }),

    multicall({
      ctx,
      calls: pools.map(
        (pool) => ({ target: masterChef.address, params: [pool.address, ctx.address, pool.address] }) as const,
      ),
      abi: abi.pendingTokens,
    }),

    multicall({
      ctx,
      calls: pools.flatMap(
        (pool) =>
          pool.rewards?.map(
            (rewardToken) =>
              ({ target: pool.rewarder, params: [ctx.address, (rewardToken as BaseContract).address] }) as const,
          ) ?? [],
      ),
      abi: abi.earned,
    }),
  ])

  let rewardIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const userDepositBalanceRes = userDepositBalancesRes[poolIdx]
    const pendingBaseRewardRes = pendingBaseRewardsRes[poolIdx]

    if (!userDepositBalanceRes.success) {
      rewardIdx += pool.rewards?.length ?? 0
      continue
    }

    const balance: FarmBalance = {
      chain: ctx.chain,
      address: pool.address,
      symbol: pool.symbol,
      decimals: pool.decimals,
      amount: userDepositBalanceRes.output,
      underlyings: pool.underlyings,
      category: 'farm',
      rewarder: pool.rewarder,
    }

    // base reward
    const rewards: Balance[] = []
    if (pendingBaseRewardRes.success) {
      const [pendingVTX] = pendingBaseRewardRes.output
      rewards.push({ ...VTX, amount: pendingVTX })
    }

    // extra reward
    if (pool.rewards) {
      for (const reward of pool.rewards) {
        if (pendingRewardsRes[rewardIdx].success) {
          rewards.push({ ...reward, amount: pendingRewardsRes[rewardIdx].output })
        }
        rewardIdx++
      }
    }

    balance.rewards = rewards

    // resolve LP underlyings
    if (balance.amount > 0n) {
      if (balance.symbol === 'JLP') {
        const underlyings = await getPoolsUnderlyings(ctx, balance)
        balance.underlyings = [...underlyings]
      }
    }

    balances.push(balance)
  }

  return balances
}

// TODO: reuse TraderJoe logic
const getPoolsUnderlyings = async (ctx: BalancesContext, contract: Contract): Promise<Balance[]> => {
  const [
    underlyingToken0AddressesRes,
    underlyingsTokens1AddressesRes,
    underlyingsTokensReservesRes,
    totalPoolSupplyRes,
  ] = await Promise.all([
    call({ ctx, target: contract.address, abi: abi.token0 }),
    call({ ctx, target: contract.address, abi: abi.token1 }),
    call({ ctx, target: contract.address, abi: abi.getReserves }),
    call({ ctx, target: contract.address, abi: abi.totalSupply }),
  ])
  const [_reserve0, _reserve1] = underlyingsTokensReservesRes

  const totalPoolSupply = totalPoolSupplyRes

  const underlyings = await getERC20Details(ctx, [underlyingToken0AddressesRes, underlyingsTokens1AddressesRes])

  const underlyings0 = {
    ...underlyings[0],
    amount: (contract.amount * _reserve0) / totalPoolSupply,
  }
  const underlyings1 = {
    ...underlyings[1],
    amount: (contract.amount * _reserve1) / totalPoolSupply,
  }

  return [underlyings0, underlyings1]
}
