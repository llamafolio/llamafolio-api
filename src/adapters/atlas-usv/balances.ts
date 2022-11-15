import { call } from '@defillama/sdk/build/abi'
import { Balance, Contract } from '@lib/adapter'
import { BaseContext } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers/lib/ethers'

export async function getStakeBalance(ctx: BaseContext, chain: Chain, contract?: Contract) {
  if (!contract || !contract.underlyings?.[0]) {
    return
  }

  try {
    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    })

    const amount = BigNumber.from(balanceOfRes.output)

    const balance: Balance = {
      ...contract,
      rewards: undefined,
      amount,
      underlyings: [{ ...contract.underlyings?.[0], amount }],
      category: 'stake',
    }

    return balance
  } catch (error) {
    return
  }
}
