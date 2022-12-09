import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

import { getCRVCVXRewards } from './rewards'

const cvxCRV: Contract = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
}

export async function getStakeBalances(ctx: BaseContext, chain: Chain, contract: Contract) {
  const balances: Balance[] = []

  const [getBalanceOf, getRewards] = await Promise.all([
    call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    getCRVCVXRewards(ctx, chain, contract),
  ])

  const balanceOf = BigNumber.from(getBalanceOf.output)

  balances.push({
    chain,
    address: cvxCRV.address,
    symbol: cvxCRV.symbol,
    decimals: cvxCRV.decimals,
    amount: balanceOf,
    rewards: getRewards,
    category: 'stake',
  })

  return balances
}
