import type { BaseContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

import { aaveProvider } from '../providers/aave'
import { convexProvider } from '../providers/convex'
import { curveProvider } from '../providers/curve'
import { fraxpoolProvider } from '../providers/fraxpool'
import { stakedaoProvider } from '../providers/stakedao'
import { uniswapProvider } from '../providers/uniswap'
import { uniswap3Provider } from '../providers/uniswap3'
import { uniswapNFTProvider } from '../providers/uniswapNFT'

const abi = {
  stakingToken: {
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract ERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getAllRewardTokens: {
    inputs: [],
    name: 'getAllRewardTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

interface IContractList {
  [key: string]: { name: string; address: `0x$Pstring}`; provider: string }[]
}

export async function getFraxContracts(ctx: BaseContext, contractList: IContractList): Promise<Contract[]> {
  const farmContracts = contractList.staking_contracts
  const contracts: Contract[] = []

  const calls: Call<typeof abi.stakingToken>[] = farmContracts.map((contract) => ({ target: contract.address }))

  const [stakeTokensRes, rewardsTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.stakingToken }),
    multicall({ ctx, calls, abi: abi.getAllRewardTokens }),
  ])

  farmContracts.forEach((contract, idx) => {
    const stakeTokenRes = stakeTokensRes[idx]
    const lpToken = stakeTokenRes.success ? stakeTokenRes.output : contract.address
    const rewardToken = rewardsTokensRes[idx]
    const rewards = rewardToken.success
      ? rewardToken.output
      : (['0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'] as `0x${string}`[]) // FXS

    contracts.push({
      ...contract,
      address: lpToken,
      chain: ctx.chain,
      lpToken,
      stakeAddress: contract.address,
      rewards,
      decimals: 18,
    })
  })

  return getUnderlyingsContracts(ctx, contracts)
}

type Provider = (ctx: BaseContext, pools: Contract[]) => Promise<Contract[]>

const providers: Record<string, Provider | undefined> = {
  aave: aaveProvider,
  arrakis: uniswapProvider,
  curve: curveProvider,
  convex: convexProvider,
  uniswap: uniswapProvider,
  uniswapBoosted: uniswapProvider,
  uniswap3: uniswap3Provider,
  uniswapNFT: uniswapNFTProvider,
  stakedao: stakedaoProvider,
  fraxpool: fraxpoolProvider,
}

const getUnderlyingsContracts = async (ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> => {
  // resolve underlyings
  const poolsByProvider = groupBy(contracts, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Contract[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as Contract[])
      }),
    )
  ).flat()
}
