import { Chain, providers } from '@defillama/sdk/build/general'
import { getLendingPoolContracts as getAaveLendingPoolContracts } from '@lib/aave/v2/lending'
import { Balance, BaseContext, Contract, RewardBalance } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { ContractsMap } from '@lib/map'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { ethers } from 'ethers'

import MultiFeeDistributionABI from './abis/MultiFeeDistribution.json'

export interface GetMultiFeeDistributionBalancesParams {
  lendingPool: Contract
  multiFeeDistribution: Contract
  stakingToken: Token
}

export async function getMultiFeeDistributionBalances(
  ctx: BaseContext,
  chain: Chain,
  lendingPoolContracts: Contract[],
  params: GetMultiFeeDistributionBalancesParams,
) {
  const rewardsBalances: Balance[] = []
  const balances: Balance[] = []
  const provider = providers[chain]

  const lendingPoolContractByAddress: { [key: string]: Contract } = {}
  for (const contract of lendingPoolContracts) {
    lendingPoolContractByAddress[contract.address.toLowerCase()] = contract
  }

  const multiFeeDistribution = new ethers.Contract(
    params.multiFeeDistribution.address,
    MultiFeeDistributionABI,
    provider,
  )

  const [claimableRewards, lockedBalances, unlockedBalances, earnedBalances] = await Promise.all([
    multiFeeDistribution.claimableRewards(ctx.address),
    multiFeeDistribution.lockedBalances(ctx.address),
    multiFeeDistribution.unlockedBalance(ctx.address),
    multiFeeDistribution.earnedBalances(ctx.address),
  ])

  const tokens = claimableRewards.map((res: any) => res.token)
  const tokenDetails = await getERC20Details(chain, tokens)
  const tokenByAddress: { [key: string]: Token } = {}
  for (const token of tokenDetails) {
    tokenByAddress[token.address] = token
  }

  const lockedBalance: Balance = {
    chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: lockedBalances.total,
    category: 'lock',
  }
  balances.push(lockedBalance)

  const unlockedBalance: Balance = {
    chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: unlockedBalances,
    category: 'stake',
  }
  balances.push(unlockedBalance)

  const rewardRates = await multicall({
    chain,
    calls: tokenDetails.map((t) => ({
      target: multiFeeDistribution.address,
      params: t.address,
    })),
    abi: {
      inputs: [{ internalType: 'address', name: '', type: 'address' }],
      name: 'rewardData',
      outputs: [
        { internalType: 'uint256', name: 'periodFinish', type: 'uint256' },
        { internalType: 'uint256', name: 'rewardRate', type: 'uint256' },
        {
          internalType: 'uint256',
          name: 'lastUpdateTime',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'rewardPerTokenStored',
          type: 'uint256',
        },
        { internalType: 'uint256', name: 'balance', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const stakedSupply = await multiFeeDistribution.totalSupply()

  for (let i = 0; i < claimableRewards.length; i++) {
    const rewardData = claimableRewards[i]

    const token = tokenByAddress[rewardData.token]
    if (!token) {
      continue
    }
    const rewardRate = rewardRates[i]

    // let apy =  (604800 * (rData.rewardRate / decimal) * assetPrice * 365 / 7  /(geistPrice * totalSupply /1e18));

    const reward: RewardBalance = {
      chain,
      address: rewardData.token,
      amount: rewardData.amount,
      decimals: token.decimals,
      symbol: token.symbol,
      category: 'reward',
      type: 'reward',
      claimable: rewardData.amount,
      rates: {
        rate: rewardRate.output.rewardRate,
        period: 604800,
        token: rewardData.token,
        decimals: token.decimals,
        symbol: token.symbol,
        //below is the token that you stake or lock to receive the above reward, it is required to calculate an APR
        stakedToken: params.stakingToken.address,
        stakedSymbol: params.stakingToken.symbol,
        stakedDecimals: params.stakingToken.decimals,
        stakedSupply: stakedSupply,
      },
    }

    // try to reuse contracts from LendingPool to connect reward tokens with their underlyings
    const underlyings = lendingPoolContractByAddress[rewardData.token.toLowerCase()]?.underlyings
    if (underlyings) {
      reward.underlyings = [{ ...underlyings[0], amount: rewardData.amount }]
    }

    rewardsBalances.push(reward)
  }

  // fix missing rewards underlyings:
  // rewards accumulate in all gTokens and the account may not have interacted with all of them (for ex if never claimed rewards)
  const missingRewardsUnderlyings = rewardsBalances.filter((balance) => !balance.underlyings)
  if (missingRewardsUnderlyings.length > 0) {
    const gTokens = await getAaveLendingPoolContracts(chain, params.lendingPool)

    const gTokensMap = new ContractsMap<Contract>(gTokens)

    for (const rewardsBalance of rewardsBalances) {
      if (!rewardsBalance.underlyings) {
        const gToken = gTokensMap.get(rewardsBalance)
        if (gToken && gToken.underlyings?.[0]) {
          rewardsBalance.underlyings = [{ ...gToken.underlyings[0], amount: rewardsBalance.amount }]
        }
      }
    }
  }

  const earnedBalance: Balance = {
    chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: earnedBalances.total,
    category: 'vest',
  }
  balances.push(earnedBalance)

  return balances.concat(rewardsBalances)
}
