import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { isNotNullish } from '@lib/type'

const abi = {
  checkBalance: {
    inputs: [{ internalType: 'address', name: '_asset', type: 'address' }],
    name: 'checkBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const vaultAddress: `0x${string}` = `0x2d62f6d8288994c7900e9c359f8a72e84d17bfba`

export async function getStableFiBalance(ctx: BalancesContext, pool: Contract): Promise<Balance> {
  const rawUnderlyings = pool.underlyings as Contract[]
  const [userBalance, totalSupply, token0Balance, token1Balance, token2Balance] = await Promise.all([
    call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: pool.address, abi: erc20Abi.totalSupply }),
    call({ ctx, target: vaultAddress, params: [rawUnderlyings[0].address], abi: abi.checkBalance }),
    call({ ctx, target: vaultAddress, params: [rawUnderlyings[1].address], abi: abi.checkBalance }),
    call({ ctx, target: vaultAddress, params: [rawUnderlyings[2].address], abi: abi.checkBalance }),
  ])

  const tokensBalances = [token0Balance, token1Balance, token2Balance]

  const underlyings = rawUnderlyings
    .map((underlying, index) => {
      if (!totalSupply || totalSupply === 0n) return null
      return { ...underlying, amount: (userBalance * tokensBalances[index]) / totalSupply }
    })
    .filter(isNotNullish)

  return {
    ...pool,
    amount: userBalance,
    underlyings,
    rewards: undefined,
    category: 'farm',
  }
}
