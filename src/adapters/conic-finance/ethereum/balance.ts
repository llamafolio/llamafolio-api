import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

const abi = {
  exchangeRate: {
    inputs: [],
    name: 'exchangeRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUserBalanceForPool: {
    inputs: [
      { internalType: 'address', name: 'conicPool', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'getUserBalanceForPool',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimableRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'claimableRewards',
    outputs: [
      { internalType: 'uint256', name: 'cncRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'crvRewards', type: 'uint256' },
      { internalType: 'uint256', name: 'cvxRewards', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getConicBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  staker: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balancesOfRes, claimableRewardsRes, exchangeRatesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: staker.address, params: [contract.address, ctx.address] })),
      abi: abi.getUserBalanceForPool,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.rewarder, params: [ctx.address] })),
      abi: abi.claimableRewards,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address })),
      abi: abi.exchangeRate,
    }),
  ])

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const underlying = contract.underlyings?.[0] as Contract
    const rewards = contract.rewards as Contract[]
    const balanceOfRes = balancesOfRes[poolIdx]
    const claimableRewardRes = claimableRewardsRes[poolIdx]
    const exchangeRateRes = isSuccess(exchangeRatesRes[poolIdx])
      ? exchangeRatesRes[poolIdx].output
      : utils.parseEther('1.0')

    if (!underlying || !rewards || !isSuccess(balanceOfRes) || !isSuccess(claimableRewardRes)) {
      continue
    }

    balances.push({
      ...contract,
      category: 'stake',
      amount: BigNumber.from(balanceOfRes.output).mul(exchangeRateRes).div(utils.parseEther('1.0')),
      underlyings: [underlying],
      rewards: [
        { ...rewards[0], amount: BigNumber.from(claimableRewardRes.output.cncRewards) },
        { ...rewards[1], amount: BigNumber.from(claimableRewardRes.output.crvRewards) },
        { ...rewards[2], amount: BigNumber.from(claimableRewardRes.output.cvxRewards) },
      ],
    })
  }

  return balances
}
