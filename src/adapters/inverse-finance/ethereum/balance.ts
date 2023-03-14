import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getMarketsBalances } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  compAccrued: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'compAccrued',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const INV: Token = {
  chain: 'ethereum',
  address: '0x41d5d79431a913c4ae7d69a668ecdfe5ff9dfb68',
  decimals: 18,
  symbol: 'INV',
}

export async function getInverseLendingBalances(
  ctx: BalancesContext,
  markets: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const rewards: Balance[] = []

  const [marketsBalancesRes, { output: marketsRewardsRes }] = await Promise.all([
    getMarketsBalances(ctx, markets),
    call({ ctx, target: comptroller.address, params: [ctx.address], abi: abi.compAccrued }),
  ])

  rewards.push({ ...INV, amount: BigNumber.from(marketsRewardsRes), category: 'reward' })

  return [...marketsBalancesRes, ...rewards]
}
