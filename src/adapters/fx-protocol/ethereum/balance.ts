import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { parseEther } from 'viem'

const abi = {
  getCurrentNav: {
    inputs: [],
    name: 'getCurrentNav',
    outputs: [
      { internalType: 'uint256', name: '_baseNav', type: 'uint256' },
      { internalType: 'uint256', name: '_fNav', type: 'uint256' },
      { internalType: 'uint256', name: '_xNav', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const stETH: Contract = {
  chain: 'ethereum',
  address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
  symbol: 'stETH',
  decimals: 18,
}

interface converterProps {
  poolBalance: Balance
  navValues: readonly bigint[]
  balance?: bigint
}

export async function getfxBalances(ctx: BalancesContext, pools: Contract[], treasury: Contract): Promise<Balance[]> {
  const [userBalances, navValues] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    call({ ctx, target: treasury.address, abi: abi.getCurrentNav }),
  ])

  const poolBalances: Balance[] = mapSuccessFilter(userBalances, (res, index) => ({
    ...pools[index],
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'farm',
  }))

  return Promise.all([
    fETHTostETH({ poolBalance: poolBalances[0], navValues }),
    sfETHTostETH({ poolBalance: poolBalances[1], navValues }),
    xETHTostETH({ poolBalance: poolBalances[2], navValues }),
  ])
}

const fETHTostETH = async ({ poolBalance, balance, navValues }: converterProps) => {
  const _nav = navValues[0]
  const _balance = balance ?? poolBalance.amount
  return { ...poolBalance, underlyings: [{ ...stETH, amount: _balance / (_nav / parseEther('1.0')) }] }
}

const sfETHTostETH = async ({ poolBalance, navValues }: converterProps) => {
  const _nav = navValues[1]
  const ethBalance = (poolBalance.amount * _nav) / parseEther('1.0')
  return fETHTostETH({ poolBalance, balance: ethBalance, navValues })
}

const xETHTostETH = async ({ poolBalance, navValues }: converterProps) => {
  const _nav = navValues[2]
  const ethBalance = (poolBalance.amount * _nav) / parseEther('1.0')
  return fETHTostETH({ poolBalance, balance: ethBalance, navValues })
}
