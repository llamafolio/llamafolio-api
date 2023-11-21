import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  extension: {
    inputs: [],
    name: 'extension',
    outputs: [{ internalType: 'contract IPoolExtension', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getUnpaid: {
    inputs: [{ internalType: 'address', name: 'wallet', type: 'address' }],
    name: 'getUnpaid',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lockupPeriod: {
    inputs: [],
    name: 'lockupPeriod',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  shares: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'shares',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'stakedTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rewardOf: {
    inputs: [{ internalType: 'address', name: 'stakeHolder', type: 'address' }],
    name: 'rewardOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const PAAL: Contract = {
  chain: 'ethereum',
  address: '0x14feE680690900BA0ccCfC76AD70Fd1b95D10e16',
  symbol: '$PAAL',
  decimals: 9,
}

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  symbol: 'WETH',
  decimals: 18,
}

export async function getPaalLockersContracts(ctx: BaseContext, lockers: `0x${string}`[]): Promise<Contract[]> {
  const rewarders = await multicall({
    ctx,
    calls: lockers.map((locker) => ({ target: locker }) as const),
    abi: abi.extension,
  })

  return mapSuccessFilter(rewarders, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    token: PAAL.address,
    rewarder: res.output,
  }))
}

export async function getPaalLockersBalances(ctx: BalancesContext, lockers: Contract[]): Promise<Balance[]> {
  const [userBalances, pendingPaals, pendingEths] = await Promise.all([
    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] }) as const),
      abi: abi.shares,
    }),

    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.rewarder, params: [ctx.address] }) as const),
      abi: abi.rewardOf,
    }),
    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.address, params: [ctx.address] }) as const),
      abi: abi.getUnpaid,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], pendingPaals[i], pendingEths[i]]),

    (res, index) => {
      const locker = lockers[index]
      const [{ output: stake }, { output: paalsRewards }, { output: ethRewards }] = res.inputOutputPairs

      const now = Date.now() / 1000
      const [amount, end] = stake
      const unlockAt = Number(end)

      return {
        ...locker,
        amount,
        unlockAt,
        claimable: now > unlockAt ? amount : 0n,
        underlyings: undefined,
        rewards: [
          { ...PAAL, amount: paalsRewards },
          { ...WETH, amount: ethRewards },
        ],
        category: 'lock',
      }
    },
  )
}
