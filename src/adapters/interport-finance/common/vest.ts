import type { BalancesContext, Contract, VestBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  checkVestingBalances: {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'checkVestingBalances',
    outputs: [
      { internalType: 'uint256', name: 'vestedTotal', type: 'uint256' },
      { internalType: 'uint256', name: 'vestingTotal', type: 'uint256' },
      {
        components: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'unlockTime', type: 'uint256' },
        ],
        internalType: 'struct StablecoinFarm.VestedBalance[]',
        name: 'vestData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ITP: Contract = {
  chain: 'ethereum',
  address: '0x2b1D36f5B61AdDAf7DA7ebbd11B35FD8cfb0DE31',
  symbol: 'ITP',
  decimals: 18,
}

export async function getITPVestBalances(
  ctx: BalancesContext,
  pools: Contract[],
  masterChefAddress: `0x${string}`,
): Promise<VestBalance[][]> {
  const userVestings = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: masterChefAddress, params: [pool.pid, ctx.address] }) as const),
    abi: abi.checkVestingBalances,
  })

  return mapSuccessFilter(userVestings, (res) => {
    const [_vestedTotal, _vestingTotal, components] = res.output

    return components.map(({ amount, unlockTime }, _index) => {
      const now = Date.now() / 1000
      const unlockAt = Number(unlockTime)

      return {
        ...ITP,
        amount,
        unlockAt,
        claimable: now > unlockAt ? amount : 0n,
        underlyings: undefined,
        rewards: undefined,
        category: 'vest',
      }
    })
  })
}
