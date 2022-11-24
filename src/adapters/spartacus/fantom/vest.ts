import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const SPA: Contract = {
  name: 'Spartacus ',
  displayName: 'Spartacus ',
  chain: 'fantom',
  address: '0x5602df4A94eB6C680190ACCFA2A475621E0ddBdc',
  decimals: 9,
  symbol: 'SPA',
}

export async function getVestBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls = contracts.map((contract) => ({
    target: contract.address,
    params: [ctx.address],
  }))

  const vestingBalanceOfRes = await multicall({
    chain,
    calls,
    abi: {
      inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
      name: 'pendingPayoutFor',
      outputs: [{ internalType: 'uint256', name: 'pendingPayout_', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const vestingBalanceOf = vestingBalanceOfRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]
    const vestingBalance = vestingBalanceOf[i]

    balances.push({
      chain,
      address: contract.address,
      symbol: contract.symbol,
      decimals: 9,
      amount: vestingBalance,
      underlyings: [{ ...SPA, amount: vestingBalance }],
      category: 'vest',
    })
  }

  return balances
}
