import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import { abi } from '@lib/erc20'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const SPELL: Token = {
  chain: 'ethereum',
  address: '0x090185f2135308BaD17527004364eBcC2D37e5F6',
  decimals: 18,
  symbol: 'SPELL',
}

export async function getSStakeContract(ctx: BaseContext, contract: Contract): Promise<Contract> {
  const underlyingTokenAddressRes = await call({
    ctx,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: 'token',
      outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const underlyings = await getERC20Details(ctx, [underlyingTokenAddressRes.output])

  const stakeContract: Contract = {
    ...contract,
    underlyings,
  }

  return stakeContract
}

export async function getSStakeBalance(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfRes, totalSupplyRes, balanceOfTokenInUnderlyingRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    }),

    call({
      ctx,
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

    call({
      ctx,
      target: SPELL.address,
      params: [contract.address],
      abi: abi.balanceOf,
    }),
  ])

  const balanceOf = BigNumber.from(balanceOfRes.output)
  const totalSupply = BigNumber.from(totalSupplyRes.output)
  const balanceOfTokenInUnderlying = BigNumber.from(balanceOfTokenInUnderlyingRes.output)

  const formattedBalanceOf = balanceOf.mul(balanceOfTokenInUnderlying).div(totalSupply)

  const balance: Balance = {
    chain: ctx.chain,
    decimals: contract.decimals,
    address: contract.address,
    symbol: contract.symbol,
    amount: formattedBalanceOf,
    underlyings: [{ ...SPELL, amount: formattedBalanceOf }],
    category: 'stake',
  }

  balances.push(balance)

  return balances
}
