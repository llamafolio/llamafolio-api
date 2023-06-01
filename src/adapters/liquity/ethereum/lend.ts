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

export async function getLendBalances(ctx: BalancesContext, troveManager: Contract) {
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
    address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
    amount: debt,
  })

  return balances
}

export const getHealthFactor = async (ctx: BalancesContext, balances: Balance[]): Promise<number | undefined> => {
  const priceFeedRes = await call({ ctx, target: priceFeed.address, abi: abi.Price })

  const lendAmounts = balances
    .filter((balance) => balance.category === 'lend')
    .map((balance) => (balance.amount * priceFeedRes) / parseEther('1.0'))

  const borrowAmounts = balances
    .filter((balance) => balance.category === 'borrow')
    .map((balance) => (balance.amount * MCR) / parseEther('1.0'))

  const lendAmount = Number(lendAmounts[0])
  const borrowAmount = Number(borrowAmounts[0])

  if (!borrowAmounts || borrowAmount === 0) {
    return
  }

  const healthFactor = Number((lendAmount * 1000) / borrowAmount) / 1000

  return healthFactor
}
