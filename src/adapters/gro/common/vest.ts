import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  totalBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'totalBalance',
    outputs: [{ internalType: 'uint256', name: 'unvested', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vestedBalance: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'vestedBalance',
    outputs: [{ internalType: 'uint256', name: 'unvested', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getGroVestingBalances(ctx: BalancesContext, vester: Contract): Promise<Balance[]> {
  const balances: Balance[] = []
  const token = vester.underlyings?.[0] as Contract

  const [{ output: balancesOfRes }, { output: claimableBalancesRes }] = await Promise.all([
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.totalBalance }),
    call({ ctx, target: vester.address, params: [ctx.address], abi: abi.vestedBalance }),
  ])

  balances.push({
    ...token,
    address: vester.address,
    amount: BigNumber.from(balancesOfRes),
    claimable: BigNumber.from(claimableBalancesRes),
    underlyings: [token],
    rewards: undefined,
    category: 'vest',
  })

  return balances
}
