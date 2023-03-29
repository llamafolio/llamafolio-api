import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  poolInfo: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'stakingToken', type: 'address' },
      { internalType: 'uint256', name: 'stakingTokenTotalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'accIcePerShare', type: 'uint256' },
      { internalType: 'uint32', name: 'lastRewardTime', type: 'uint32' },
      { internalType: 'uint16', name: 'allocPoint', type: 'uint16' },
    ],
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
  userInfo: {
    inputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      { internalType: 'uint256', name: 'remainingIceTokenReward', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingIce: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingIce',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getPopsicleFarmContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolLengthRes = await call({
    ctx,
    target: contract.address,
    abi: abi.poolLength,
  })

  const poolInfosRes = await multicall({
    ctx,
    calls: range(0, poolLengthRes.output).map((_, idx) => ({ target: contract.address, params: [idx] })),
    abi: abi.poolInfo,
  })

  for (let poolIdx = 0; poolIdx < poolLengthRes.output; poolIdx++) {
    const poolInfoRes = poolInfosRes[poolIdx]

    if (!isSuccess(poolInfoRes)) {
      continue
    }

    contracts.push({
      ...contract,
      address: poolInfoRes.output.stakingToken,
      comptroller: contract.address,
      pid: poolIdx,
    })
  }

  return getPairsDetails(ctx, contracts)
}

export async function getPopsicleFarmBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = contracts.map((contract) => ({
    target: contract.comptroller,
    params: [contract.pid, ctx.address],
  }))

  const [userInfosRes, pendingsIceRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingIce }),
  ])

  for (let contractIdx = 0; contractIdx < contracts.length; contractIdx++) {
    const contract = contracts[contractIdx]
    const underlyings = contract.underlyings as Contract[]
    const reward = contract.rewards?.[0] as Contract
    const userInfoRes = userInfosRes[contractIdx]
    const pendingIceRes = pendingsIceRes[contractIdx]

    if (!isSuccess(userInfoRes) || !isSuccess(pendingIceRes)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(userInfoRes.output.amount),
      underlyings,
      rewards: [{ ...reward, amount: BigNumber.from(pendingIceRes.output) }],
      category: 'farm',
    })
  }

  return getUnderlyingBalances(ctx, balances)
}
