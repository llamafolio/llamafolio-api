import type { BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  Troves: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'Troves',
    outputs: [
      {
        internalType: 'uint256',
        name: 'debt',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'coll',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'stake',
        type: 'uint256',
      },
      {
        internalType: 'enum TroveManager.Status',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'uint128',
        name: 'arrayIndex',
        type: 'uint128',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  Price: {
    inputs: [],
    name: 'lastGoodPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const MCR = 1.1

export async function getLendBalances(ctx: BalancesContext, _borrowerOperations: Contract, troveManager: Contract) {
  const troveDetailsRes = await call({
    ctx,
    target: troveManager.address,
    params: [ctx.address],
    abi: abi.Troves,
  })

  const [debt, coll, _stake, _status, _arrayIndex] = troveDetailsRes

  const lendingBalance: LendBalance = {
    chain: ctx.chain,
    category: 'lend',
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    amount: coll,
  }

  const borrowBalance: BorrowBalance = {
    chain: ctx.chain,
    category: 'borrow',
    symbol: 'LUSD',
    decimals: 18,
    address: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    amount: debt,
  }

  return {
    balances: [lendingBalance, borrowBalance],
    MCR,
  }
}
