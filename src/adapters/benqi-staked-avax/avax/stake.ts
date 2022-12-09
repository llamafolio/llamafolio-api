import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

const WAVAX: Contract = {
  name: 'Wrapped AVAX',
  chain: 'avax',
  address: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  symbol: 'WAVAX ',
  decimals: 18,
}

export async function getStakeBalances(ctx: BalancesContext, chain: Chain, contract: Contract): Promise<Balance> {
  const [balanceOfRes, poolValueRes, totalSupplyRes] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'totalPooledAvax',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: 'totalSupply',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const poolValue = BigNumber.from(poolValueRes.output)
  const totalSupply = BigNumber.from(totalSupplyRes.output)

  const amount = balanceOf.mul(poolValue).div(totalSupply)

  const balance: Balance = {
    ...contract,
    rewards: undefined,
    amount,
    underlyings: [{ ...WAVAX, amount }],
  }

  return balance
}
