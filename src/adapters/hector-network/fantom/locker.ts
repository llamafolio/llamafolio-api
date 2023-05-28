import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  getFnfts: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'getFnfts',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'secs', type: 'uint256' },
          { internalType: 'uint256', name: 'multiplier', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
          { internalType: 'uint256', name: 'pendingReward', type: 'uint256' },
        ],
        internalType: 'struct ILockFarm.FNFTInfo[]',
        name: 'infos',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'uint256', name: 'fnftId', type: 'uint256' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: 'reward', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const HEC: Token = {
  chain: 'fantom',
  address: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
  decimals: 9,
  symbol: 'HEC',
}

export async function getHECLockerBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const multipleUnderlyingsBalances: Balance[] = []

  const fnftsIdxRes = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] } as const)),
    abi: abi.getFnfts,
  })

  const pendingRewardsRes = await multicall({
    ctx,
    calls: fnftsIdxRes.flatMap((fnftIdxRes) =>
      fnftIdxRes.success
        ? fnftIdxRes.output.map((fnft: any) => ({ target: fnftIdxRes.input.target, params: [fnft.id] } as const))
        : null,
    ),
    abi: abi.pendingReward,
  })

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const underlyings = locker.underlyings as Contract[]
    const fnftIdxRes = fnftsIdxRes[lockerIdx]
    const pendingRewards = pendingRewardsRes.filter((res: any) => res.input.target === locker.address)

    if (!underlyings || !fnftIdxRes.success) {
      continue
    }

    for (let fnftIdx = 0; fnftIdx < fnftIdxRes.output.length; fnftIdx++) {
      const fnftInfos = fnftIdxRes.output[fnftIdx]

      const { amount, secs, startTime } = fnftInfos
      const pendingRewardRes = pendingRewards.find((res: any) => res.input.params[0] === fnftInfos.id)

      if (!pendingRewardRes || !pendingRewardRes.success) {
        continue
      }

      const balance: Balance = {
        ...locker,
        address: locker.lpToken ? locker.lpToken : locker.address,
        amount,
        underlyings,
        unlockAt: Number(secs + startTime),
        rewards: [{ ...HEC, amount: pendingRewardRes.output }],
        category: 'lock',
      }

      if (balance.underlyings!.length > 1) {
        multipleUnderlyingsBalances.push(balance)
        continue
      }

      balances.push(balance)
    }
  }

  balances.push(...(await getUnderlyingBalances(ctx, multipleUnderlyingsBalances)))

  return balances
}
