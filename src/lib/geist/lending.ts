import {
  getLendingPoolBalances as getAaveLendingPoolBalances,
  getLendingPoolContracts as getAaveLendingPoolContracts,
} from '@lib/aave/v2/lending'
import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { keyBy, range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'

const abi = {
  registeredTokens: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'registeredTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
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
  claimableReward: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      { internalType: 'address[]', name: '_tokens', type: 'address[]' },
    ],
    name: 'claimableReward',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export interface GetLendingPoolContractsParams {
  ctx: BaseContext
  lendingPool: Contract
  chefIncentivesController: Contract
  rewardToken: Token
}

/**
 * Get AAVE LendingPool lending and borrowing contracts with rewards from ChefIncentives
 */

export async function getLendingPoolContracts(
  ctx: BaseContext,
  lendingPool: Contract,
  chefIncentivesController: Contract,
  rewardToken: Token,
) {
  const contracts: Contract[] = []
  const aaveLendingPoolContracts = await getAaveLendingPoolContracts(ctx, lendingPool)
  const aaveLendingPoolContractsByAddress = keyBy(aaveLendingPoolContracts, 'address', { lowercase: false })

  const { output: lmRewardsCount } = await call({ ctx, target: chefIncentivesController.address, abi: abi.poolLength })

  const registeredTokensRes = await multicall({
    ctx,
    calls: range(0, lmRewardsCount).map((_, idx) => ({
      target: chefIncentivesController.address,
      params: [idx],
    })),
    abi: abi.registeredTokens,
  })

  for (const registeredTokenRes of registeredTokensRes) {
    if (!isSuccess(registeredTokenRes)) {
      continue
    }
    const contract = aaveLendingPoolContractsByAddress[registeredTokenRes.output]
    if (contract) {
      contracts.push({ ...contract, rewards: [rewardToken] })
    }
  }

  return contracts
}

export interface GetLendingPoolBalancesParams {
  chefIncentivesController: Contract
}

export async function getLendingPoolBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  chefIncentivesController: Contract,
) {
  const balances: Balance[] = []
  const lendBalances = await getAaveLendingPoolBalances(ctx, contracts)
  const balanceByAddress = keyBy(lendBalances, 'address', { lowercase: false })

  const claimableRewards = await multicall({
    ctx,
    // @ts-ignore
    calls: contracts.map((contract) => ({
      target: chefIncentivesController.address,
      params: [ctx.address, [contract.address]],
    })),
    abi: abi.claimableReward,
  })

  // Attach ChefIncentives rewards
  for (let rewardIdx = 0; rewardIdx < claimableRewards.length; rewardIdx++) {
    const claimableReward = claimableRewards[rewardIdx]

    if (!isSuccess(claimableReward)) {
      continue
    }

    const balance = balanceByAddress[contracts[rewardIdx].address]
    const reward = balance.rewards?.[0] as Contract

    if (balance && reward) {
      balances.push({
        ...(balance as Balance),
        rewards: [{ ...(reward as Contract), amount: claimableReward.output[0] }],
      })
    }
  }

  return balances
}
