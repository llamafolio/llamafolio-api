import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { parseEther } from 'viem'

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

const priceFeed: Contract = {
  chain: 'ethereum',
  address: '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De',
}
const MCR = parseEther('1.1')

export async function getLendBalances(ctx: BalancesContext, borrowerOperations: Contract, troveManager: Contract) {
  const balances: Balance[] = []

  const troveDetailsRes = await call({
    ctx,
    target: troveManager.address,
    params: [ctx.address],
    abi: abi.Troves,
  })

  const [debt, coll, _stake, _status, _arrayIndex] = troveDetailsRes

  balances.push({
    chain: ctx.chain,
    category: 'lend',
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    amount: coll,
  })

  balances.push({
    chain: ctx.chain,
    category: 'borrow',
    symbol: 'LUSD',
    decimals: 18,
    address: '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
    amount: debt,
  })

  return balances
}

export const getHealthFactor = async (ctx: BalancesContext, balances: Balance[]): Promise<number | undefined> => {
  const priceFeedRes = await call({ ctx, target: priceFeed.address, abi: abi.Price })

  const lendBalance = balances.find(
    (balance) => balance.category === 'lend' && balance.address === '0x0000000000000000000000000000000000000000',
  )
  const borrowBalance = balances.find(
    (balance) => balance.category === 'borrow' && balance.address === '0x5f98805a4e8be255a32880fdec7f6728c6568ba0',
  )

  const lendAmount = ((lendBalance?.amount || 0n) * priceFeedRes) / parseEther('1.0')
  const borrowAmount = ((borrowBalance?.amount || 0n) * MCR) / parseEther('1.0')

  if (borrowAmount === 0n) {
    return
  }

  return Number(lendAmount) / Number(borrowAmount)
}
