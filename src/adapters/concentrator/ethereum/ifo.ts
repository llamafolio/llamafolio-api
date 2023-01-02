import { Balance, BalancesContext } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { BigNumber, ethers } from 'ethers'

import ConcentratorIFOAbi from '../abis/IFO.json'

export async function getIFOBalances(ctx: BalancesContext) {
  const provider = providers['ethereum']

  const ifoContract = new ethers.Contract('0x3cf54f3a1969be9916dad548f3c084331c4450b5', ConcentratorIFOAbi, provider)

  const poolLength = await ifoContract.poolLength()

  let calls = []
  for (let index = 0; index < poolLength.toNumber(); index++) {
    calls.push({
      params: [index],
      target: ifoContract.address,
    })
  }

  const poolDetailsRes = await multicall({
    ctx,
    calls: calls,
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'poolInfo',
      outputs: [
        { internalType: 'uint128', name: 'totalUnderlying', type: 'uint128' },
        { internalType: 'uint128', name: 'totalShare', type: 'uint128' },
        { internalType: 'uint256', name: 'accRewardPerShare', type: 'uint256' },
        { internalType: 'uint256', name: 'convexPoolId', type: 'uint256' },
        { internalType: 'address', name: 'lpToken', type: 'address' },
        { internalType: 'address', name: 'crvRewards', type: 'address' },
        {
          internalType: 'uint256',
          name: 'withdrawFeePercentage',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'platformFeePercentage',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'harvestBountyPercentage',
          type: 'uint256',
        },
        { internalType: 'bool', name: 'pauseDeposit', type: 'bool' },
        { internalType: 'bool', name: 'pauseWithdraw', type: 'bool' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolDetails = poolDetailsRes.filter((res) => res.success).map((res) => res.output)

  calls = []
  for (let index = 0; index < poolLength.toNumber(); index++) {
    calls.push({
      params: [index, ctx.address],
      target: ifoContract.address,
    })
  }

  const poolBalancesRes = await multicall({
    ctx,
    calls: calls,
    abi: {
      inputs: [
        {
          internalType: 'uint256',
          name: '_pid',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: '_account',
          type: 'address',
        },
      ],
      name: 'getUserShare',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolBalances = poolBalancesRes.filter((res) => res.success).map((res) => res.output)

  const lpTokens = []
  const pids = []
  const correspondingKeys = []
  for (let index = 0; index < poolBalances.length; index++) {
    const poolBalance = poolBalances[index]
    if (poolBalance > 0) {
      pids.push(index)
      lpTokens.push(poolDetails[index].lpToken)
      correspondingKeys[poolDetails[index].lpToken] = index
    }
  }

  if (pids.length > 0) {
    calls = []
    for (let index = 0; index < pids.length; index++) {
      calls.push({
        params: [pids[index], ctx.address],
        target: ifoContract.address,
      })
    }
  }

  const pendingRewardsRes = await multicall({
    ctx,
    calls: calls,
    abi: {
      inputs: [
        {
          internalType: 'uint256',
          name: '_pid',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: '_account',
          type: 'address',
        },
      ],
      name: 'pendingCTR',
      outputs: [
        {
          internalType: 'uint256',
          name: '',
          type: 'uint256',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const pendingRewards = pendingRewardsRes.filter((res) => res.success)

  const lpTokenDetails = await getERC20Details(ctx, lpTokens)

  const balances: Balance[] = []
  for (let index = 0; index < poolBalances.length; index++) {
    const poolBalance = poolBalances[index]
    if (poolBalance > 0) {
      const tokenDetail = lpTokenDetails.find((o) => o.address === poolDetails[index].lpToken)
      const pendingReward = pendingRewards.find(
        (o) => o.input.params[0] === correspondingKeys[poolDetails[index].lpToken],
      )

      const balance: Balance = {
        chain: ctx.chain,
        category: 'lp',
        symbol: tokenDetail.symbol,
        decimals: tokenDetail.decimals,
        address: tokenDetail.address,
        amount: BigNumber.from(poolBalance),
      }

      balances.push(balance)

      if (pendingReward) {
        balances.rewards = [
          {
            chain: ctx.chain,
            category: 'lp',
            symbol: 'CTR',
            decimals: 18,
            address: '0xb3ad645db386d7f6d753b2b9c3f4b853da6890b8',
            amount: BigNumber.from(pendingReward.output),
          },
        ]
      }
    }
  }

  return balances
}
