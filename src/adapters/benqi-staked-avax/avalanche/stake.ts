import { getBenqiLockerBalances } from '@adapters/benqi-staked-avax/avalanche/locker'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getAvaxByShares: {
    inputs: [{ internalType: 'uint256', name: 'shareAmount', type: 'uint256' }],
    name: 'getPooledAvaxByShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getRequestCount: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUnlockRequestCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPaginatedUnlockRequests: {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'from', type: 'uint256' },
      { internalType: 'uint256', name: 'to', type: 'uint256' },
    ],
    name: 'getPaginatedUnlockRequests',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'shareAmount', type: 'uint256' },
        ],
        internalType: 'struct StakedAvaxStorage.UnlockRequest[]',
        name: '',
        type: 'tuple[]',
      },
      { internalType: 'uint256[]', name: '', type: 'uint256[]' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  cooldownPeriod: {
    inputs: [],
    name: 'cooldownPeriod',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WAVAX: Token = {
  chain: 'avalanche',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

export async function getBenqiBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const [shareBalance, [lockInfos], cooldown] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    getBenqiLockerBalances(ctx, contract),
    call({ ctx, target: contract.address, abi: abi.cooldownPeriod }),
  ])

  const rawStakeBalance: Balance = {
    ...contract,
    amount: shareBalance,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }

  const rawLockBalances: Balance[] = lockInfos.map((infos) => {
    const now = Date.now() / 1000
    const { startedAt, shareAmount } = infos
    const unlockAt = Number(startedAt + cooldown)

    return {
      ...contract,
      amount: shareAmount,
      unlockAt,
      claimable: now > unlockAt ? shareAmount : 0n,
      underlyings: undefined,
      rewards: undefined,
      category: 'lock',
    }
  })

  const assetBalances = await multicall({
    ctx,
    calls: [rawStakeBalance, ...rawLockBalances].map(
      (balance) => ({ target: balance.address, params: [balance.amount] }) as const,
    ),
    abi: abi.getAvaxByShares,
  })

  return mapSuccessFilter(assetBalances, (res, index) => ({
    ...[rawStakeBalance, ...rawLockBalances][index],
    underlyings: [{ ...WAVAX, amount: res.output }],
  }))
}

async function getBenqiLockerBalances(ctx: BalancesContext, contract: Contract) {
  const positionLength = await call({ ctx, target: contract.address, params: [ctx.address], abi: abi.getRequestCount })

  return await call({
    ctx,
    target: contract.address,
    params: [ctx.address, 0n, positionLength],
    abi: abi.getPaginatedUnlockRequests,
  })
}
