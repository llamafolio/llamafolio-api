import { Chain, providers } from '@defillama/sdk/build/general'
import {
  getLendingPoolBalances as getAaveLendingPoolBalances,
  getLendingPoolContracts as getAaveLendingPoolContracts,
} from '@lib/aave/v2/lending'
import { Balance, BaseContext, Contract, RewardBalance } from '@lib/adapter'
import { range } from '@lib/array'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { BigNumber, ethers } from 'ethers'

import ChefIncentivesControllerABI from './abis/ChefIncentivesController.json'

export interface GetLendingPoolContractsParams {
  chain: Chain
  lendingPool: Contract
  chefIncentivesController: Contract
  rewardToken: Token
}

/**
 * Get AAVE LendingPool lending and borrowing contracts with rewards from ChefIncentives
 */
export async function getLendingPoolContracts({
  chain,
  lendingPool,
  chefIncentivesController,
  rewardToken,
}: GetLendingPoolContractsParams) {
  const provider = providers[chain]

  const aaveLendingPoolContracts = await getAaveLendingPoolContracts(chain, lendingPool)

  const aaveLendingPoolContractsByAddress: { [key: string]: Contract } = {}
  for (const contract of aaveLendingPoolContracts) {
    aaveLendingPoolContractsByAddress[contract.address] = contract
  }

  // add ChefIncentives rewards
  const chefIncentives = new ethers.Contract(chefIncentivesController.address, ChefIncentivesControllerABI, provider)

  const lmRewardsCount = (await chefIncentives.poolLength()).toNumber()

  const registeredTokensRes = await multicall({
    chain,
    calls: range(0, lmRewardsCount).map((_, i) => ({
      target: chefIncentives.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'registeredTokens',
      outputs: [{ internalType: 'address', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })
  const registeredTokensAddresses = registeredTokensRes.map((res) => res.output)

  for (const address of registeredTokensAddresses) {
    const contract = aaveLendingPoolContractsByAddress[address]
    if (contract) {
      const reward: Contract = {
        ...rewardToken,
        category: 'reward',
        type: 'reward',
      }
      contract.rewards = [reward]
    }
  }

  return aaveLendingPoolContracts
}

export interface GetLendingPoolBalancesParams {
  chefIncentivesController: Contract
}

export async function getLendingPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
  { chefIncentivesController }: GetLendingPoolBalancesParams,
) {
  const provider = providers[chain]

  const balances = await getAaveLendingPoolBalances(ctx, chain, contracts)

  const balanceByAddress: { [key: string]: Balance } = {}
  for (const balance of balances) {
    balanceByAddress[balance.address] = balance
  }

  // lending / borrowing rewards
  const chefIncentives = new ethers.Contract(chefIncentivesController.address, ChefIncentivesControllerABI, provider)

  const registeredTokensAddresses = contracts.map((contract) => contract.address).filter(isNotNullish)

  const claimableRewards: BigNumber[] = await chefIncentives.claimableReward(ctx.address, registeredTokensAddresses)

  // Attach ChefIncentives rewards
  for (let i = 0; i < claimableRewards.length; i++) {
    const balance = balanceByAddress[registeredTokensAddresses[i]]
    if (balance && balance.rewards?.[0]) {
      const reward = balance.rewards[0] as RewardBalance
      reward.amount = claimableRewards[i]
      reward.claimable = claimableRewards[i]
    }
  }

  return balances
}
