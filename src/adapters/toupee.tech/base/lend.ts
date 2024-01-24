import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'

const abi = {
  balanceOfTOKEN: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOfTOKEN',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Contract = {
  chain: 'base',
  address: '0x4200000000000000000000000000000000000006',
  decimals: 18,
  symbol: 'WETH',
}

const WIG: Contract = {
  chain: 'base',
  address: '0x58Dd173F30EcfFdfEbCd242C71241fB2f179e9B9',
  decimals: 18,
  symbol: 'WIG',
}

export async function getToupeeLendBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const userBalance = await call({ ctx, target: contract.address, params: [ctx.address], abi: abi.balanceOfTOKEN })
  return [createContract(WIG, userBalance, 'lend'), createContract(WETH, userBalance, 'borrow')]
}

function createContract(contract: Contract, userBalance: bigint, category: Category): Balance {
  return { ...contract, amount: userBalance, underlyings: undefined, rewards: undefined, category }
}
