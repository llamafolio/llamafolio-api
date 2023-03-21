import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  getUnlockRequestCount: {
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
  getPooledAvaxByShares: {
    inputs: [{ internalType: 'uint256', name: 'shareAmount', type: 'uint256' }],
    name: 'getPooledAvaxByShares',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const WAVAX: Token = {
  chain: 'avax',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

export async function getBenqiLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [{ output: lockersPositionsLength }, { output: cooldownPeriodRes }] = await Promise.all([
    call({
      ctx,
      target: locker.address,
      params: [ctx.address],
      abi: abi.getUnlockRequestCount,
    }),
    call({ ctx, target: locker.address, abi: abi.cooldownPeriod }),
  ])

  const { output: lockersBalances } = await call({
    ctx,
    target: locker.address,
    params: [ctx.address, 0, lockersPositionsLength],
    abi: abi.getPaginatedUnlockRequests,
  })

  const fmtLockerBalancesRes = await multicall({
    ctx,
    calls: lockersBalances[0].map((balance: any) => ({ target: locker.address, params: balance.shareAmount })),
    abi: abi.getPooledAvaxByShares,
  })

  for (let idx = 0; idx < lockersPositionsLength; idx++) {
    const lockersBalance = lockersBalances[0][idx]
    const fmtLockerBalanceRes = fmtLockerBalancesRes[idx]
    const lockEnd = parseInt(lockersBalance.startedAt) + parseInt(cooldownPeriodRes)

    if (!isSuccess(fmtLockerBalanceRes) || !lockEnd) {
      continue
    }

    balances.push({
      ...locker,
      rewards: undefined,
      amount: BigNumber.from(fmtLockerBalanceRes.output),
      lock: { end: lockEnd },
      underlyings: [{ ...WAVAX }],
      category: 'lock',
    })
  }

  return balances
}
