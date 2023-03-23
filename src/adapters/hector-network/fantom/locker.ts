import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

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
}

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
    calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] })),
    abi: abi.getFnfts,
  })

  const pendingRewardsRes = await multicall({
    ctx,
    calls: fnftsIdxRes.flatMap((fnftIdxRes) =>
      isSuccess(fnftIdxRes)
        ? fnftIdxRes.output.map((fnft: any) => ({ target: fnftIdxRes.input.target, params: [fnft.id] }))
        : null,
    ),
    abi: abi.pendingReward,
  })

  for (let lockerIdx = 0; lockerIdx < lockers.length; lockerIdx++) {
    const locker = lockers[lockerIdx]
    const underlyings = locker.underlyings as Contract[]
    const fnftIdxRes = fnftsIdxRes[lockerIdx]
    const pendingRewards = pendingRewardsRes.filter((res: any) => res.input.target === locker.address)

    if (!underlyings || !isSuccess(fnftIdxRes)) {
      continue
    }

    for (let fnftIdx = 0; fnftIdx < fnftIdxRes.output.length; fnftIdx++) {
      const fnftInfos = fnftIdxRes.output[fnftIdx]

      const { amount, secs, startTime } = fnftInfos
      const pendingRewardRes = pendingRewards.find((res: any) => res.input.params[0] === fnftInfos.id)

      if (!pendingRewardRes || !isSuccess(pendingRewardRes)) {
        continue
      }

      const balance: Balance = {
        ...locker,
        address: locker.lpToken ? locker.lpToken : locker.address,
        amount: BigNumber.from(amount),
        underlyings,
        lock: { end: parseInt(secs) + parseInt(startTime) },
        rewards: [{ ...HEC, amount: BigNumber.from(pendingRewardRes.output) }],
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
