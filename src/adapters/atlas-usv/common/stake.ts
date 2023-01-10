import { Balance, Contract } from '@lib/adapter'
import { BalancesContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers/lib/ethers'

// multi-chain underlying token
const USV: Token = {
  chain: 'ethereum',
  address: '0x88536C9B2C4701b8dB824e6A16829D5B5Eb84440',
  symbol: 'USV',
  decimals: 9,
}

export async function getStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    ...contract,
    amount,
    underlyings: [{ ...USV, amount }],
    rewards: undefined,
    category: 'stake',
  }

  return balance
}
