import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details, getERC20Details2 } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

interface BalanceWithExtraProps extends Balance {
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

export async function getFarmContracts(chain: Chain, masterChef?: Contract): Promise<Contract[]> {
  if (!masterChef) {
    return []
  }
  const contracts: Contract[] = []

  const poolsLength = await call({
    chain,
    target: masterChef.address,
    params: [],
    abi: {
      inputs: [],
      name: 'poolLength',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolsAddressesRes = await multicall({
    chain,
    calls: range(0, poolsLength.output).map((i) => ({
      target: masterChef.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'registeredToken',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolsAddresses = poolsAddressesRes.filter((res) => res.success).map((res) => res.output)

  const poolInfosRes = await multicall({
    chain,
    calls: poolsAddresses.map((pool) => ({
      target: masterChef.address,
      params: [pool],
    })),
    abi: {
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
  })

  const poolInfos = poolInfosRes.filter((res) => res.success).map((res) => res.output)
  const lpTokensAddresses = poolInfos.map((token) => token.lpToken)

  const [pools, lpTokens] = await Promise.all([
    getERC20Details(chain, poolsAddresses),
    getERC20Details(chain, lpTokensAddresses),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const poolInfo = poolInfos[i]
    const lpToken = lpTokens[i]

    contracts.push({
      chain,
      address: pool.address,
      lpToken: lpToken.address,
      rewarder: poolInfo.rewarder,
      helper: poolInfo.helper,
      decimals: lpToken.decimals,
      symbol: lpToken.symbol,
    })
  }
  return contracts
}

export async function getFarmBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
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
      abi: {
        inputs: [
          { internalType: 'address', name: '_lp', type: 'address' },
          { internalType: 'address', name: '_user', type: 'address' },
        ],
        name: 'depositInfo',
        outputs: [{ internalType: 'uint256', name: 'availableAmount', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: token.helper,
        params: [],
      })),
      abi: {
        inputs: [],
        name: 'depositToken',
        outputs: [{ internalType: 'address', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
    multicall({
      chain,
      calls: contracts.map((token) => ({
        target: masterChef.address,
        params: [token.lpToken, ctx.address, token.address],
      })),
      abi: {
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
    }),
  ])

  const userDepositBalances = userDepositBalancesRes.map((res) => res.output)
  const depositTokensPools = depositTokensPoolsRes.map((res) => res.output)
  const pendingBaseRewards = pendingBaseRewardsRes.map((res) => res.output.pendingVTX)

  const tokens = await getERC20Details2(chain, depositTokensPools)

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const userDepositBalance = userDepositBalances[i]
    const token = tokens[i]
    const pendingBaseReward = pendingBaseRewards[i]

    if (token !== null) {
      const balance: BalanceWithExtraProps = {
        chain,
        address: token.address,
        lpToken: contract.lpToken,
        rewarder: contract.rewarder,
        helper: contract.helper,
        decimals: token.decimals,
        amount: BigNumber.from(userDepositBalance),
        rewards: [{ ...VTX, amount: BigNumber.from(pendingBaseReward) }],
        category: 'farm',
      }

      if (balance.amount.gt(0)) {
        const extraRewards = await getExtraRewards(ctx, chain, balance)
        balance.rewards?.push(...extraRewards)
      }
      balances.push(balance)
    }
  }

  return balances
}

const getExtraRewards = async (ctx: BaseContext, chain: Chain, balance: BalanceWithExtraProps): Promise<Balance[]> => {
  const pendingRewardsTokensRes = await multicall({
    chain,
    // There is no logic in the contracts to know the number of tokens in advance. Among all the contracts examined, 6 seems to be the maximum number of tokens used.
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
