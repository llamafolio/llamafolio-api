import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy, range } from '@lib/array'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
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
  poolInfos: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'poolInfo',
    outputs: [
      { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
      { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
      { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
      { internalType: 'uint256', name: 'accStargatePerShare', type: 'uint256' },
    ],
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
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingStargate: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingStargate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingEmissionToken: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingEmissionToken',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getStargateFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  comptrollers: Contract[],
): Promise<Balance[]> {
  const contracts: Contract[] = []
  const balances: Balance[] = []

  const poolByAddress = keyBy(pools, 'address', { lowercase: true })

  const poolsLengthRes = await multicall({
    ctx,
    calls: comptrollers.map((comptroller) => ({ target: comptroller.address })),
    abi: abi.poolLength,
  })

  const poolsInfosRes = await multicall({
    ctx,
    calls: poolsLengthRes.flatMap((poolsLength) =>
      isSuccess(poolsLength)
        ? range(0, poolsLength.output).map((_, idx) => ({ target: poolsLength.input.target, params: [idx] }))
        : null,
    ),
    abi: abi.poolInfos,
  })

  for (const poolsInfoRes of poolsInfosRes) {
    if (!isSuccess(poolsInfoRes)) {
      continue
    }

    const contract = poolByAddress[poolsInfoRes.output.lpToken.toLowerCase()]
    if (contract) {
      contracts.push({ ...contract, comptroller: poolsInfoRes.input.target, pid: poolsInfoRes.input.params[0] })
    }
  }

  const calls: Call[] = contracts.map((contract) => ({
    target: contract.comptroller,
    params: [contract.pid, ctx.address],
  }))

  const [userBalancesOfsRes, pendingRewardsRes, pendingEmissionsTokenRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.userInfo }),
    multicall({ ctx, calls, abi: abi.pendingStargate }),
    multicall({ ctx, calls, abi: abi.pendingEmissionToken }),
  ])

  for (let idx = 0; idx < contracts.length; idx++) {
    const contract = contracts[idx]
    const underlyings = contract.underlyings as Contract[]
    const reward = contract.rewards?.[0] as Contract
    const userBalancesOfRes = userBalancesOfsRes[idx]
    const pendingRewardRes = pendingRewardsRes[idx]
    const pendingEmissionTokenRes = pendingEmissionsTokenRes[idx]

    if (!underlyings || !isSuccess(userBalancesOfRes)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(userBalancesOfRes.output.amount),
      underlyings,
      rewards: [
        {
          ...reward,
          amount: isSuccess(pendingRewardRes)
            ? BigNumber.from(pendingRewardRes.output)
            : BigNumber.from(pendingEmissionTokenRes.output),
        },
      ],
      category: 'farm',
    })
  }

  return balances
}
