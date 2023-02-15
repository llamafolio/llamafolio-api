import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  locked: {
    stateMutability: 'view',
    type: 'function',
    name: 'locked',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'amount', type: 'int128' },
          { name: 'end', type: 'uint256' },
        ],
      },
    ],
    gas: 5483,
  },
}

const CTR: Token = {
  chain: 'ethereum',
  address: '0xb3ad645db386d7f6d753b2b9c3f4b853da6890b8',
  decimals: 18,
  symbol: 'CTR',
}

export async function getLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance> {
  const lockedInfosRes = await call({ ctx, target: locker.address, params: [ctx.address], abi: abi.locked })

  return {
    ...locker,
    amount: BigNumber.from(lockedInfosRes.output.amount),
    underlyings: [CTR],
    rewards: undefined,
    lock: { end: lockedInfosRes.output.end },
    category: 'lock',
  }
}
