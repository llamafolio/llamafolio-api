import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const Spool: Token = {
  chain: 'ethereum',
  address: '0x40803cEA2b2A32BdA1bE61d3604af6a814E70976',
  decimals: 18,
  symbol: 'SPOOL',
}

export async function getStakeBalances(ctx: BalancesContext, contract: Contract) {
  const balances: Balance[] = []

  const [getBalances, getEarned] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'balances',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      ctx,
      target: contract.address,
      params: [Spool.address, ctx.address],
      abi: {
        inputs: [
          { internalType: 'contract IERC20', name: 'token', type: 'address' },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'earned',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const amount = BigNumber.from(getBalances.output)
  const earned = BigNumber.from(getEarned.output)

  balances.push({
    chain: ctx.chain,
    address: Spool.address,
    decimals: Spool.decimals,
    symbol: Spool.symbol,
    amount,
    rewards: [{ ...Spool, amount: earned }],
    category: 'stake',
  })

  return balances
}
