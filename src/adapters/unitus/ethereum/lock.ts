import { getUnitusEthPricesPerShares } from '@adapters/unitus/ethereum/stake'
import type { Balance, BalancesContext, Contract, LockBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { getPricesPerSharesBalances } from '@lib/pricePerShare'

const abi = {
  getCurrentExchangeRate: {
    inputs: [],
    name: 'getCurrentExchangeRate',
    outputs: [{ internalType: 'uint256', name: '_exchangeRate', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getLocker: {
    inputs: [{ internalType: 'address', name: '_lockerAddress', type: 'address' }],
    name: 'getLocker',
    outputs: [
      { internalType: 'uint32', name: '', type: 'uint32' },
      { internalType: 'uint32', name: '', type: 'uint32' },
      { internalType: 'uint96', name: '', type: 'uint96' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getUnitusLockerBalance(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  const now = Date.now() / 1000
  const [end, _, amount] = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.getLocker })
  const unlockAt = Number(end)

  const shareLockBalance: LockBalance = {
    ...locker,
    amount,
    unlockAt,
    claimable: now > unlockAt ? amount : 0n,
    underlyings: locker.underlyings as Contract[],
    rewards: undefined,
    category: 'lock',
  }

  return getPricesPerSharesBalances(ctx, [shareLockBalance], {
    getPricesPerShares: (params) =>
      getUnitusEthPricesPerShares({ ...params, getAddress: (contract: Contract) => contract.token! }),
  })
}
