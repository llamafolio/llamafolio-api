import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export async function getLendBalances(ctx: BalancesContext, chain: Chain, troveManager: Contract) {
  const balances: Balance[] = []

  const troveDetailsRes = await call({
    chain,
    target: troveManager.address,
    params: [ctx.address],
    abi: {
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
  })

  const troveDetails = troveDetailsRes.output

  balances.push({
    chain: chain,
    category: 'lend',
    symbol: 'ETH',
    decimals: 18,
    address: '0x0000000000000000000000000000000000000000',
    amount: BigNumber.from(troveDetails.coll),
  })

  balances.push({
    chain: chain,
    category: 'borrow',
    symbol: 'LUSD',
    decimals: 18,
    address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
    amount: BigNumber.from(troveDetails.debt),
  })

  return balances
}
