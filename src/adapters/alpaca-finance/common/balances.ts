import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers/lib/ethers'

const abi = {
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'int256', name: 'rewardDebt', type: 'int256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingAlpaca: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingAlpaca',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalToken: {
    inputs: [],
    name: 'totalToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  fairLaunch: Contract,
  alpaca: Contract,
) {
  const balances: Balance[] = []

  const calls = pools.map((pool) => ({
    target: fairLaunch.address,
    params: [pool.pid, ctx.address],
  }))

  const supplyCalls = pools.map((pool) => ({
    target: pool.address,
    params: [],
  }))

  const balanceOfCalls = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address],
  }))

  const [userInfosRes, pendingRewardsRes, totalTokensRes, totalSuppliesRes, balancesOfRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingAlpaca }),
    multicall({ ctx, calls: supplyCalls, abi: abi.totalToken }),
    multicall({ ctx, calls: supplyCalls, abi: abi.totalSupply }),
    multicall({ ctx, calls: balanceOfCalls, abi: erc20Abi.balanceOf }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const userInfoRes = userInfosRes[i]
    const pendingRewardRes = pendingRewardsRes[i]
    const totalTokenRes = totalTokensRes[i]
    const totalSupplyRes = totalSuppliesRes[i]
    const balanceOfRes = balancesOfRes[i]

    if (!isSuccess(totalTokenRes) || !isSuccess(totalSupplyRes) || totalSupplyRes.output == 0) {
      continue
    }

    // farm
    if (isSuccess(userInfoRes)) {
      const farmBalance: Balance = {
        ...(pool as Balance),
        amount: BigNumber.from(userInfoRes.output.amount).mul(totalTokenRes.output).div(totalSupplyRes.output),
        category: 'farm',
      }

      if (isSuccess(pendingRewardRes)) {
        farmBalance.rewards = [{ ...alpaca, amount: BigNumber.from(pendingRewardRes.output) }]
      }

      balances.push(farmBalance)
    }

    // lp
    if (isSuccess(balanceOfRes)) {
      const lpBalance: Balance = {
        ...(pool as Balance),
        amount: BigNumber.from(balanceOfRes.output).mul(totalTokenRes.output).div(totalSupplyRes.output),
        category: 'lp',
      }

      balances.push(lpBalance)
    }
  }

  return balances
}
