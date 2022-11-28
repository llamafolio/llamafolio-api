import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { abi } from '@lib/erc20'
import { BigNumber } from 'ethers'

const HEC: Contract = {
  name: 'Hector',
  chain: 'fantom',
  address: '0x5C4FDfc5233f935f20D2aDbA572F770c2E377Ab0',
  decimals: 9,
  symbol: 'HEC',
}

export async function getsStakeBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const amount = BigNumber.from(balanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...HEC, amount }],
    category: 'stake',
  }

  return balance
}

export async function getWsStakeBalances(ctx: BaseContext, chain: Chain, contract: Contract): Promise<Balance> {
  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  })

  const balanceOf = balanceOfRes.output

  const formattedBalanceOfRes = await call({
    chain,
    target: contract.address,
    params: [balanceOf],
    abi: {
      inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
      name: 'wsHECTosHEC',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const amount = BigNumber.from(formattedBalanceOfRes.output)

  const balance: Balance = {
    chain,
    address: contract.address,
    symbol: contract.symbol,
    decimals: 9,
    amount,
    underlyings: [{ ...HEC, amount }],
    category: 'stake',
  }

  return balance
}
