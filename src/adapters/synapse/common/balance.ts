import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
// import { getPairsBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
    outputs: [{ internalType: 'uint256', name: 'pools', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lpToken: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'lpToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
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
  pendingSynapse: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingSynapse',
    outputs: [{ internalType: 'uint256', name: 'pending', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getSynapseContract(chain: Chain, contract: Contract) {
  const contracts: Contract[] = []

  const poolLentghRes = await call({
    chain,
    target: contract.address,
    params: [],
    abi: abi.poolLength,
  })

  const poolLength = parseInt(poolLentghRes.output)

  const calls = range(0, poolLength).map((i) => ({
    target: contract.address,
    params: [i],
  }))

  const lpTokensRes = await multicall({ chain, calls, abi: abi.lpToken })

  for (let i = 0; i < poolLength; i++) {
    const lpTokenRes = lpTokensRes[i]

    if (!isSuccess(lpTokenRes)) {
      i++
    }

    if (contract.rewards)
      contracts.push({
        chain,
        address: lpTokenRes.output,
        rewards: contract.rewards,
      })
  }

  const test = await getPairsDetails(chain, contracts)
  console.log(test)

  return await getPairsDetails(chain, contracts)
}

export async function getSynapseBalances(
  ctx: BalancesContext,
  chain: Chain,
  contracts: Contract[],
  MiniChef: Contract,
) {
  const balances: Balance[] = []

  const calls = range(0, contracts.length).map((i) => ({
    target: MiniChef.address,
    params: [i, ctx.address],
  }))

  const [balancesOfRes, pendingRewardsRes] = await Promise.all([
    multicall({ chain, calls, abi: abi.userInfo }),
    multicall({ chain, calls, abi: abi.pendingSynapse }),
  ])

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const balanceOf = balancesOfRes[i]
    const pendingRewardRes = pendingRewardsRes[i]
    const rewards = contract.rewards?.[0]

    if (!isSuccess(balanceOf) || !isSuccess(pendingRewardRes)) {
      i++
    }

    if (rewards)
      balances.push({
        ...contract,
        amount: BigNumber.from(balanceOf.output.amount),
        rewards: [{ ...rewards, amount: BigNumber.from(pendingRewardRes.output) }],
        category: 'farm',
      })
  }

  return await getUnderlyingBalances(chain, balances)
}
