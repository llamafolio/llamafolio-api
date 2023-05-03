import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

const abi = {
  getRate: {
    inputs: [],
    name: 'getRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getSwellBalances(ctx: BalancesContext, contract: Contract): Promise<Balance> {
  const { output: balanceOf } = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: erc20Abi.balanceOf,
  })

  const { output: rate } = await call({ ctx, target: contract.address, abi: abi.getRate })

  return {
    ...contract,
    amount: BigNumber.from(balanceOf),
    underlyings: [{ ...WETH, amount: BigNumber.from(balanceOf).mul(rate).div(utils.parseEther('1.0')) }],
    rewards: undefined,
    category: 'farm',
  }
}
