import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  getVestingPosition: {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: '_limit', type: 'uint256' },
      { internalType: 'uint256', name: '_offset', type: 'uint256' },
    ],
    name: 'getVestingPosition',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'bool', name: 'hasClaimed', type: 'bool' },
          { internalType: 'bool', name: 'hasAborted', type: 'bool' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'endTime', type: 'uint256' },
          { internalType: 'uint256', name: 'lastClaimTime', type: 'uint256' },
          { internalType: 'uint256', name: 'totalUnlockedAmount', type: 'uint256' },
        ],
        internalType: 'struct IVester.Item[]',
        name: 'itemList',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getHMXVestBalances(ctx: BalancesContext, vester: Contract): Promise<Balance[]> {
  const LIMIT = 100n
  const offset = 0n

  const vestInfos = await call({
    ctx,
    target: vester.address,
    params: [ctx.address, LIMIT, offset],
    abi: abi.getVestingPosition,
  })

  return vestInfos.map((info) => {
    const { amount, endTime } = info
    const now = Date.now() / 1000
    const unlockAt = Number(endTime)

    return {
      ...vester,
      amount,
      underlyings: undefined,
      claimable: now > unlockAt ? amount : 0n,
      unlockAt,
      rewards: undefined,
      category: 'vest',
    }
  })
}
