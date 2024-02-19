import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance } from '@lib/adapter'
import { call } from '@lib/call'

const abi = {
  MCR: {
    inputs: [],
    name: 'MCR',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  getIndividualStates: {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'getIndividualStates',
    outputs: [
      { internalType: 'uint256', name: 'coll', type: 'uint256' },
      { internalType: 'uint256', name: 'debt', type: 'uint256' },
      { internalType: 'bool', name: 'isCreated', type: 'bool' },
      {
        components: [{ internalType: 'uint256', name: 'lockedBlockHeight', type: 'uint256' }],
        internalType: 'struct IYamato.FlashLockData',
        name: 'lock',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const CJPY: Contract = {
  chain: 'ethereum',
  address: '0x1cfa5641c01406ab8ac350ded7d735ec41298372',
  decimals: 18,
  symbol: 'CJPY',
}

export async function getYamatoCDPBalances(ctx: BalancesContext, controller: Contract): Promise<Balance[]> {
  const [[coll, debt], MCR] = await Promise.all([
    call({ ctx, target: controller.address, params: [ctx.address], abi: abi.getIndividualStates }),
    call({ ctx, target: controller.address, abi: abi.MCR }),
  ])

  const lendBalance: LendBalance = {
    ...WETH,
    amount: coll,
    underlyings: undefined,
    rewards: undefined,
    category: 'lend',
    MCR: MCR / 1e2,
  }

  const borrowBalance: BorrowBalance = {
    ...CJPY,
    amount: debt,
    underlyings: undefined,
    rewards: undefined,
    category: 'borrow',
  }

  return [lendBalance, borrowBalance]
}
