import { Balance, BaseContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { Chain } from '@lib/chains'
import { Call, multicall } from '@lib/multicall'
import { getStakingPoolsBalances } from '@lib/pools'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

import { PoolContract } from './pools'
import { Registry } from './registries'

const abi = {
  n_gauges: {
    name: 'n_gauges',
    outputs: [{ type: 'int128', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1991,
  },
  gauge_controller: {
    stateMutability: 'view',
    type: 'function',
    name: 'gauge_controller',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
    gas: 2078,
  },
  gauges: {
    name: 'gauges',
    outputs: [{ type: 'address', name: '' }],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 2160,
  },
  lp_token: {
    name: 'lp_token',
    outputs: [{ type: 'address', name: '' }],
    inputs: [],
    stateMutability: 'view',
    type: 'function',
    gas: 1481,
  },
  get_gauges: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauges',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [
      { name: '', type: 'address[10]' },
      { name: '', type: 'int128[10]' },
    ],
    gas: 20157,
  },
  get_gauge: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_gauge',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3089,
  },
  reward_tokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'reward_tokens',
    inputs: [{ name: 'arg0', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 3787,
  },
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_addr', type: 'address' },
      { name: '_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 3034,
  },
}

export async function getGaugesContracts(
  chain: Chain,
  registries: Partial<Record<Registry, string>>,
  pools: PoolContract[],
  CRV: Token,
) {
  const gaugeContracts: Contract[] = []

  const poolsByRegistryId = groupBy(pools, 'registryId')
  const registriesIds = (Object.keys(poolsByRegistryId) as Registry[]).filter(
    (registryId) =>
      registryId === 'stableSwap' ||
      registryId === 'stableFactory' ||
      registryId === 'cryptoSwap' ||
      registryId === 'cryptoFactory',
  )

  const registriesGauges = await Promise.all(
    registriesIds.map((registryId) =>
      multicall<string, [string], string[][] | string>({
        chain,
        calls: poolsByRegistryId[registryId].map((pool) => ({
          target: registries[registryId] as string,
          params: [pool.pool],
        })),
        abi: registryId === 'stableSwap' || registryId === 'cryptoSwap' ? abi.get_gauges : abi.get_gauge,
      }),
    ),
  )

  for (let registryIdx = 0; registryIdx < registriesGauges.length; registryIdx++) {
    for (let poolIdx = 0; poolIdx < registriesGauges[registryIdx].length; poolIdx++) {
      const gaugesRes = registriesGauges[registryIdx][poolIdx]
      if (!isSuccess(gaugesRes)) {
        continue
      }

      const registryId = registriesIds[registryIdx]
      const pool = poolsByRegistryId[registryId][poolIdx]
      const gauges: string[] = []

      if (registryId === 'stableSwap' || registryId === 'cryptoSwap') {
        gauges.push(...(gaugesRes.output[0] as string[]).filter((address) => address !== ethers.constants.AddressZero))
      } else {
        gauges.push(gaugesRes.output as string)
      }

      for (const gauge of gauges) {
        const gaugeContract: Contract = {
          chain,
          address: gauge,
          pool: pool.pool,
          lpToken: pool.lpToken,
          yieldKey: pool.lpToken,
          underlyings: pool.underlyings?.slice(),
        }

        gaugeContracts.push(gaugeContract)
      }
    }
  }

  // get reward tokens
  const calls: Call[] = []

  for (let gaugeIdx = 0; gaugeIdx < gaugeContracts.length; gaugeIdx++) {
    for (let rewardIdx = 0; rewardIdx < 4; rewardIdx++) {
      calls.push({ target: gaugeContracts[gaugeIdx].address, params: [rewardIdx] })
    }
  }

  const rewardTokensRes = await multicall({
    chain,
    calls,
    abi: abi.reward_tokens,
  })

  let callIdx = 0
  for (let gaugeIdx = 0; gaugeIdx < gaugeContracts.length; gaugeIdx++) {
    const rewards = [CRV]

    for (let rewardIdx = 0; rewardIdx < 4; rewardIdx++) {
      const rewardTokenRes = rewardTokensRes[callIdx]

      if (isSuccess(rewardTokenRes) && rewardTokenRes.output !== ethers.constants.AddressZero) {
        rewards.push(rewardTokenRes.output)
      }

      callIdx++
    }

    gaugeContracts[gaugeIdx].rewards = rewards
  }

  return gaugeContracts
}

export async function getGaugesBalances(ctx: BaseContext, chain: Chain, gauges: Contract[]) {
  const gaugesBalances: Balance[] = []
  const calls: Call[] = []

  const gaugesBalancesRes = await getStakingPoolsBalances(ctx, chain, gauges, {
    getLPTokenAddress: (contract) => contract.lpToken,
    getPoolAddress: (contract) => contract.pool,
  })

  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const rewards = gaugesBalancesRes[gaugeIdx].rewards || []
    for (let rewardIdx = 0; rewardIdx < rewards.length; rewardIdx++) {
      calls.push({ target: gaugesBalancesRes[gaugeIdx].address, params: [ctx.address, rewards[rewardIdx].address] })
    }
  }

  const claimableRewards = await multicall({ chain, calls, abi: abi.claimable_reward })

  for (let gaugeIdx = 0; gaugeIdx < gaugesBalancesRes.length; gaugeIdx++) {
    const rewards = gaugesBalancesRes[gaugeIdx].rewards || []
    const gaugeRewards = []

    for (let rewardIdx = 0; rewardIdx < rewards.length; rewardIdx++) {
      const gaugeRewardRes = claimableRewards[gaugeIdx]
      if (isSuccess(gaugeRewardRes)) {
        gaugeRewards.push({
          ...gaugesBalancesRes[gaugeIdx].rewards![rewardIdx],
          amount: BigNumber.from(claimableRewards[gaugeIdx].output),
        })
      }
    }

    gaugesBalances.push({ ...gaugesBalancesRes[gaugeIdx], rewards: gaugeRewards })
  }

  return gaugesBalances
}
