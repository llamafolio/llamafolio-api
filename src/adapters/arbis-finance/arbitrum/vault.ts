import type { BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'

const abi = {
  depositToken: {
    inputs: [],
    name: 'depositToken',
    outputs: [{ internalType: 'contract IPair', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken1: {
    inputs: [],
    name: 'rewardToken1',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  rewardToken2: {
    inputs: [],
    name: 'rewardToken2',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pid: {
    inputs: [],
    name: 'pid',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getArbisVaults(ctx: BaseContext, vaultsAddresses: `0x${string}`[]): Promise<Contract[]> {
  const [stakingTokens, rewardToken1s, rewardToken2s, pids] = await Promise.all([
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.depositToken }),
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.rewardToken1 }),
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.rewardToken2 }),
    multicall({ ctx, calls: vaultsAddresses.map((vault) => ({ target: vault }) as const), abi: abi.pid }),
  ])

  const pools = mapMultiSuccessFilter(
    stakingTokens.map((_, i) => [stakingTokens[i], rewardToken1s[i], rewardToken2s[i], pids[i]]),

    (res, index) => {
      const address = vaultsAddresses[index]
      const [{ output: token }, { output: reward0 }, { output: reward1 }, { output: pid }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address,
        token,
        rewards: [reward0, reward1],
        pid,
      }
    },
  )

  return getPairsDetails(ctx, pools)
}
