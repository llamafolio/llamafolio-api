import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

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
}

interface FarmContract extends Contract {
  rewarder: string
}

interface FarmBalance extends Balance {
  rewarder: string
}

const VTX: Token = {
  chain: 'avax',
  address: '0x5817D4F0b62A59b17f75207DA1848C2cE75e7AF4',
  decimals: 18,
  symbol: 'VTX',
}

export async function getFarmContracts(chain: Chain, masterChef: Contract) {
  const contracts: FarmContract[] = []

  const poolsLength = await call({
    chain,
    target: masterChef.address,
    params: [],
    abi: abi.poolLength,
  })

  const poolsAddressesRes = await multicall({
    chain,
    calls: range(0, poolsLength.output).map((i) => ({
      target: masterChef.address,
      params: [i],
    })),
    abi: abi.registeredToken,
  })

  const poolsAddresses = poolsAddressesRes.filter(isSuccess).map((res) => res.output)

  const poolInfosRes = await multicall({
    chain,
    calls: poolsAddresses.map((pool) => ({
      target: masterChef.address,
      params: [pool],
    })),
    abi: abi.addressToPoolInfo,
  })

  const poolInfos = poolInfosRes.filter(isSuccess)

  // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts checked, 7 seems to be the maximum number of extra tokens used.
  // However, this process forced us to encounter many multicall failures on contracts that do not have as many tokens
  const rewardsLength = 7

  const [depositTokensRes, rewardTokensRes] = await Promise.all([
    multicall({
      chain,
      calls: poolInfos.map((res) => ({
        target: res.output.helper,
        params: [],
      })),
      abi: abi.depositToken,
    }),

    multicall({
      chain,
      calls: poolInfos.flatMap((res) =>
        range(0, rewardsLength).map((idx) => ({
          target: res.output.rewarder,
          params: [idx],
        })),
      ),
      abi: abi.rewardTokens,
    }),
  ])

  for (let poolIdx = 0; poolIdx < poolInfos.length; poolIdx++) {
    const poolInfoRes = poolInfos[poolIdx]
    const depositTokenRes = depositTokensRes[poolIdx]

    if (!depositTokenRes) {
      continue
    }

    contracts.push({
      chain,
      address: poolInfoRes.input.params[0],
      rewarder: poolInfoRes.output.rewarder,
      underlyings: [depositTokenRes.output],
      rewards: range(poolIdx * rewardsLength, (poolIdx + 1) * rewardsLength)
        .map((rewardIdx) => rewardTokensRes[rewardIdx])
        .filter(isSuccess)
        .map((res) => res.output),
    })
  }

  return contracts
}

export async function getFarmBalances(
  ctx: BalancesContext,
  chain: Chain,
  pools: FarmContract[],
  masterChef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userDepositBalancesRes, pendingBaseRewardsRes, pendingRewardsRes] = await Promise.all([
    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: masterChef.address,
        params: [pool.address, ctx.address],
      })),
      abi: abi.depositInfo,
    }),

    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: masterChef.address,
        params: [pool.address, ctx.address, pool.address],
      })),
      abi: abi.pendingTokens,
    }),

    multicall({
      chain,
      calls: pools.flatMap(
        (pool) =>
          pool.rewards?.map((rewardToken) => ({
            target: pool.rewarder,
            params: [ctx.address, rewardToken.address],
          })) ?? [],
      ),
      abi: abi.earned,
    }),
  ])

  let rewardIdx = 0
  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const userDepositBalanceRes = userDepositBalancesRes[poolIdx]
    const pendingBaseRewardRes = pendingBaseRewardsRes[poolIdx]

    if (!isSuccess(userDepositBalanceRes)) {
      rewardIdx += pool.rewards?.length ?? 0
      continue
    }

    const balance: FarmBalance = {
      chain,
      address: pool.address,
      symbol: pool.symbol,
      decimals: pool.decimals,
      amount: BigNumber.from(userDepositBalanceRes.output),
      underlyings: pool.underlyings,
      category: 'farm',
      rewarder: pool.rewarder,
    }

    // base reward
    const rewards: Balance[] = []
    if (isSuccess(pendingBaseRewardRes)) {
      rewards.push({ ...VTX, amount: BigNumber.from(pendingBaseRewardRes.output.pendingVTX) })
    }

    // extra reward
    if (pool.rewards) {
      for (const reward of pool.rewards) {
        if (isSuccess(pendingRewardsRes[rewardIdx])) {
          rewards.push({ ...reward, amount: BigNumber.from(pendingRewardsRes[rewardIdx].output) })
        }
        rewardIdx++
      }
    }

    balance.rewards = rewards

    // resolve LP underlyings
    if (balance.amount.gt(0)) {
      if (balance.symbol === 'JLP') {
        const underlyings = await getPoolsUnderlyings(chain, balance)
        balance.underlyings = [...underlyings]
      }
    }

    balances.push(balance)
  }

  return balances
}

// TODO: reuse TraderJoe logic
const getPoolsUnderlyings = async (chain: Chain, contract: Contract): Promise<Balance[]> => {
  const [
    underlyingToken0AddressesRes,
    underlyingsTokens1AddressesRes,
    underlyingsTokensReservesRes,
    totalPoolSupplyRes,
  ] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'token0',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'token1',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
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
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const underlyingsTokensAddresses: string[] = []
  const underlyingsTokensReserves: BigNumber[] = []
  const totalPoolSupply = BigNumber.from(totalPoolSupplyRes.output)

  underlyingsTokensAddresses.push(underlyingToken0AddressesRes.output, underlyingsTokens1AddressesRes.output)
  underlyingsTokensReserves.push(
    BigNumber.from(underlyingsTokensReservesRes.output._reserve0),
    BigNumber.from(underlyingsTokensReservesRes.output._reserve1),
  )
  const underlyings = await getERC20Details(chain, underlyingsTokensAddresses)

  const underlyings0 = {
    ...underlyings[0],
    amount: contract.amount.mul(underlyingsTokensReserves[0]).div(totalPoolSupply),
  }
  const underlyings1 = {
    ...underlyings[1],
    amount: contract.amount.mul(underlyingsTokensReserves[1]).div(totalPoolSupply),
  }

  return [underlyings0, underlyings1]
}
