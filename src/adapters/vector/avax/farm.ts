import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details, getERC20DetailsTmp, resolveERC20Details } from '@lib/erc20'
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
}

interface FarmContract extends Contract {
  lpToken: string
  rewarder: string
  helper: string
}

interface FarmBalance extends Balance {
  lpToken: string
  rewarder: string
  helper: string
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

  const { pools, lpTokens } = await resolveERC20Details(chain, {
    pools: poolsAddresses,
    lpTokens: poolInfosRes.map((res) => res.output?.lpToken),
  })

  for (let i = 0; i < pools.length; i++) {
    const poolRes = pools[i]
    const poolInfoRes = poolInfosRes[i]
    const lpTokenRes = lpTokens[i]

    if (!isSuccess(poolRes) || !isSuccess(poolInfoRes) || !isSuccess(lpTokenRes)) {
      continue
    }

    contracts.push({
      chain,
      address: poolRes.output.address,
      lpToken: lpTokenRes.output.address,
      rewarder: poolInfoRes.output.rewarder,
      helper: poolInfoRes.output.helper,
      decimals: lpTokenRes.output.decimals,
      symbol: lpTokenRes.output.symbol,
    })
  }

  return contracts
}

export async function getFarmBalances(
  ctx: BalancesContext,
  chain: Chain,
  contracts: FarmContract[],
  masterChef: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userDepositBalancesRes, depositTokensPoolsRes, pendingBaseRewardsRes] = await Promise.all([
    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: masterChef.address,
        params: [token.lpToken, ctx.address],
      })),
      abi: abi.depositInfo,
    }),

    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: token.helper,
        params: [],
      })),
      abi: abi.depositToken,
    }),

    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: masterChef.address,
        params: [token.lpToken, ctx.address, token.address],
      })),
      abi: abi.pendingTokens,
    }),
  ])

  const userDepositBalances = userDepositBalancesRes.map((res) => res.output)
  const depositTokensPools = depositTokensPoolsRes.map((res) => res.output)
  const pendingBaseRewards = pendingBaseRewardsRes.map((res) => res.output.pendingVTX)

  const tokens = await getERC20DetailsTmp(chain, depositTokensPools)

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const userDepositBalance = userDepositBalances[i]
    const tokenRes = tokens[i]
    const pendingBaseReward = pendingBaseRewards[i]

    if (isSuccess(tokenRes)) {
      const balance: FarmBalance = {
        chain,
        address: tokenRes.output.address,
        lpToken: contract.lpToken,
        rewarder: contract.rewarder,
        symbol: tokenRes.output.symbol,
        helper: contract.helper,
        decimals: tokenRes.output.decimals,
        amount: BigNumber.from(userDepositBalance),
        rewards: [{ ...VTX, amount: BigNumber.from(pendingBaseReward) }],
        category: 'farm',
      }

      if (balance.amount.gt(0)) {
        const extraRewards = await getExtraRewards(ctx, chain, balance)
        balance.rewards?.push(...extraRewards)

        if (balance.symbol === 'JLP') {
          const underlyings = await getPoolsUnderlyings(chain, balance)
          balance.underlyings = [...underlyings]
        }
      }

      balances.push(balance)
    }
  }

  return balances
}

const getExtraRewards = async (ctx: BalancesContext, chain: Chain, balance: FarmBalance): Promise<Balance[]> => {
  const pendingRewardsTokensRes = await multicall({
    chain,
    // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts checked, 7 seems to be the maximum number of extra tokens used.
    // However, this process forced us to encounter many multicall failures on contracts that do not have as many tokens
    calls: range(0, 6).map((x) => ({
      target: balance.rewarder,
      params: [x],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'rewardTokens',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingRewardsTokens = pendingRewardsTokensRes.filter((res) => res.success).map((res) => res.output)
  const rewardsTokens = await getERC20Details(chain, pendingRewardsTokens)

  const pendingRewardsBalancesRes = await multicall({
    chain,
    calls: pendingRewardsTokens.map((token) => ({
      target: balance.rewarder,
      params: [ctx.address, token],
    })),
    abi: {
      inputs: [
        { internalType: 'address', name: '_account', type: 'address' },
        { internalType: 'address', name: '_rewardToken', type: 'address' },
      ],
      name: 'earned',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingRewardsBalances = pendingRewardsBalancesRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output))

  return rewardsTokens.map((token, i) => ({ ...token, amount: pendingRewardsBalances[i] }))
}

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
