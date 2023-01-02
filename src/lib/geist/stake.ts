import { Balance, BalancesContext, Contract, RewardBalance } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { ethers } from 'ethers'

import MultiFeeDistributionABI from './abis/MultiFeeDistribution.json'

export interface GetMultiFeeDistributionBalancesParams {
  lendingPool: Contract
  multiFeeDistribution: Contract
  stakingToken: Token
}

export async function getMultiFeeDistributionBalances(
  ctx: BalancesContext,
  lendingPoolContracts: Contract[],
  params: GetMultiFeeDistributionBalancesParams,
) {
  const rewardsBalances: Balance[] = []
  const balances: Balance[] = []
  const provider = providers[ctx.chain]

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
  const tokenDetails = await getERC20Details(ctx, tokens)
  const tokenByAddress: { [key: string]: Token } = {}
  for (const token of tokenDetails) {
    tokenByAddress[token.address] = token
  }

  const lockedBalance: Balance = {
    chain: ctx.chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: lockedBalances.total,
    category: 'lock',
  }
  balances.push(lockedBalance)

  const unlockedBalance: Balance = {
    chain: ctx.chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: unlockedBalances,
    category: 'stake',
  }
  balances.push(unlockedBalance)

  const rewardRates = await multicall({
    ctx,
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
      chain: ctx.chain,
      address: rewardData.token,
      amount: rewardData.amount,
      decimals: token.decimals,
      symbol: token.symbol,
      category: 'reward',
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

    // rewards accumulate in gTokens; add their underlyings
    const underlyings = lendingPoolContractByAddress[rewardData.token.toLowerCase()]?.underlyings
    if (underlyings) {
      reward.underlyings = [{ ...underlyings[0], amount: rewardData.amount }]
    }

    rewardsBalances.push(reward)
  }

  const earnedBalance: Balance = {
    chain: ctx.chain,
    address: params.stakingToken.address,
    symbol: params.stakingToken.symbol,
    decimals: params.stakingToken.decimals,
    amount: earnedBalances.total,
    category: 'vest',
  }
  balances.push(earnedBalance)

  return balances.concat(rewardsBalances)
}
