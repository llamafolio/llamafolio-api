import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber, utils } from 'ethers'

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
}

const priceFeed: Contract = {
  chain: 'ethereum',
  address: '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De',
}
const MCR = utils.parseEther('1.1')

export async function getLendBalances(ctx: BalancesContext, troveManager: Contract) {
  const balances: Balance[] = []

  const troveDetailsRes = await call({
    ctx,
    target: troveManager.address,
    params: [ctx.address],
    abi: abi.Troves,
  })

  const troveDetails = troveDetailsRes.output

  balances.push({
    chain: ctx.chain,
    category: 'lend',
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    amount: BigNumber.from(troveDetails.coll),
  })

  balances.push({
    chain: ctx.chain,
    category: 'borrow',
    symbol: 'LUSD',
    decimals: 18,
    address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
    amount: BigNumber.from(troveDetails.debt),
  })

  return balances
}

export const getHealthFactor = async (ctx: BalancesContext, balances: Balance[]): Promise<number[] | undefined> => {
  const healthFactor: number[] = []
  const priceFeedRes = await call({ ctx, target: priceFeed.address, abi: abi.Price })

  const lendAmounts = balances
    .filter((balance) => balance.category === 'lend')
    .map((balance) => balance.amount.mul(priceFeedRes.output).div(utils.parseEther('1.0')))

  const borrowAmounts = balances
    .filter((balance) => balance.category === 'borrow')
    .map((balance) => balance.amount.mul(MCR).div(utils.parseEther('1.0')))

  for (let idx = 0; idx < lendAmounts.length; idx++) {
    const lendAmount = lendAmounts[idx]
    const borrowAmount = borrowAmounts[idx]

    if (!borrowAmount) {
      return
    }

    healthFactor.push(+lendAmount.mul(1e3).div(borrowAmount) / 1e3)
  }

  return healthFactor
}
