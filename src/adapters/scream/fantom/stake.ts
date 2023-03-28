import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

const abi = {
  getShareValue: {
    inputs: [],
    name: 'getShareValue',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const SCREAM: Token = {
  chain: 'fantom',
  address: '0xe0654c8e6fd4d733349ac7e09f6f23da256bf475',
  decimals: 18,
  symbol: 'SCREAM',
}

export async function getScreamStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [{ output: balanceOfRes }, { output: getShareValueRes }] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, abi: abi.getShareValue }),
  ])

  return {
    ...staker,
    amount: BigNumber.from(balanceOfRes).mul(getShareValueRes).div(utils.parseEther('1.0')),
    underlyings: [SCREAM],
    rewards: undefined,
    category: 'stake',
  }
}
