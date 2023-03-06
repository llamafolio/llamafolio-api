import { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { groupBy } from 'lodash'

import { aaveProvider } from '../providers/aave'
import { convexProvider } from '../providers/convex'
import { curveProvider } from '../providers/curve'
import { fraxpoolProvider } from '../providers/fraxpool'
import { stakedaoProvider } from '../providers/stakedao'
import { uniswapProvider } from '../providers/uniswap'
import { uniswap3Provider } from '../providers/uniswap3'

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
}

interface IContractList {
  [key: string]: { name: string; address: string; provider: string }[]
}

export async function getFraxContracts(ctx: BaseContext, contractList: IContractList): Promise<Contract[]> {
  const farmContracts = contractList.staking_contracts
  const contracts: Contract[] = []

  const [stakeTokensRes, rewardsTokensRes] = await Promise.all([
    multicall({
      ctx,
      calls: farmContracts.map((contract) => ({ target: contract.address })),
      abi: abi.stakingToken,
    }),
    multicall({
      ctx,
      calls: farmContracts.map((contract) => ({ target: contract.address })),
      abi: abi.getAllRewardTokens,
    }),
  ])

  farmContracts.forEach((contract, idx) => {
    const stakeTokenRes = stakeTokensRes[idx]
    const lpToken = isSuccess(stakeTokenRes) ? stakeTokenRes.output : contract.address
    const rewardsTokenRes = rewardsTokensRes[idx]

    if (!isSuccess(rewardsTokenRes)) {
      return
    }

    contracts.push({
      ...contract,
      address: lpToken,
      chain: ctx.chain,
      lpToken,
      stakeAddress: contract.address,
      rewards: rewardsTokenRes.output,
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
  uniswap3: uniswap3Provider,
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
