import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
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
  SYNAPSE: {
    inputs: [],
    name: 'SYNAPSE',
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

export async function getPoolsContracts(ctx: BaseContext, contract: Contract) {
  const contracts: Contract[] = []

  const [poolLentghRes, synapseRes] = await Promise.all([
    call({
      chain: ctx.chain,
      target: contract.address,
      params: [],
      abi: abi.poolLength,
    }),
    call({
      chain: ctx.chain,
      target: contract.address,
      params: [],
      abi: abi.SYNAPSE,
    }),
  ])

  const poolLength = parseInt(poolLentghRes.output)

  const lpTokensRes = await multicall({
    chain: ctx.chain,
    calls: range(0, poolLength).map((pid) => ({
      target: contract.address,
      params: [pid],
    })),
    abi: abi.lpToken,
  })

  for (let pid = 0; pid < poolLength; pid++) {
    const lpTokenRes = lpTokensRes[pid]
    if (!isSuccess(lpTokenRes)) {
      continue
    }

    contracts.push({
      chain: ctx.chain,
      address: lpTokenRes.output,
      pid,
      rewards: [synapseRes.output],
    })
  }

  return getPairsDetails(ctx, contracts)
}

export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[], MiniChef: Contract) {
  const balances: Balance[] = []

  const calls = pools.map((pool) => ({
    target: MiniChef.address,
    params: [pool.pid, ctx.address],
  }))

  const [userInfosRes, pendingSynapsesRes] = await Promise.all([
    multicall({ chain: ctx.chain, calls, abi: abi.userInfo }),
    multicall({ chain: ctx.chain, calls, abi: abi.pendingSynapse }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const userInfoRes = userInfosRes[poolIdx]
    const pendingSynapseRes = pendingSynapsesRes[poolIdx]
    const synapse = pool.rewards?.[0]

    const amount = isSuccess(userInfoRes) ? BigNumber.from(userInfoRes.output.amount) : BN_ZERO

    const balance: Balance = {
      ...pool,
      amount,
      category: 'farm',
    }

    if (synapse && isSuccess(pendingSynapseRes)) {
      balance.rewards = [{ ...synapse, amount: BigNumber.from(pendingSynapseRes.output) }]
    }

    balances.push(balance)
  }

  return getUnderlyingBalances(ctx, balances)
}
