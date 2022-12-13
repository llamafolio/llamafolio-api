import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  userCollateralBalance: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userCollateralBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export const getLendBorrowBalances = async (ctx: BalancesContext, chain: Chain, pools: Contract[]) => {
  const balances: Balance[] = []

  const [userCollateralBalancesRes, poolTokenBalanceRes, poolCollateralTokenRes] = await Promise.all([
    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [ctx.address],
      })),
      abi: abi.userCollateralBalance,
    }),

    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [ctx.address],
      })),
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls: pools.map((pool) => ({
        target: pool.address,
        params: [],
      })),
      abi: {
        inputs: [],
        name: 'collateralContract',
        outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const poolCollateralTokensAddress = poolCollateralTokenRes.filter((res) => res.success).map((res) => res.output)

  const poolCollateralTokens = await getERC20Details(chain, poolCollateralTokensAddress)

  const poolTokenBalances = poolTokenBalanceRes.filter((res) => res.success).map((res) => BigNumber.from(res.output))

  const userCollateralBalances = userCollateralBalancesRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output))

  for (let i = 0; i < pools.length; i++) {
    const asset = pools[i]

    const poolTokenBalance = poolTokenBalances[i]

    const userCollateral = userCollateralBalances[i]

    const collateralToken = poolCollateralTokens[i]

    const supply: Balance = {
      chain,
      decimals: asset.decimals,
      symbol: asset.symbol,
      address: asset.address,
      amount: poolTokenBalance,
      category: 'lend',
      underlyings: [{ amount: userCollateral, ...collateralToken }],
    }

    balances.push(supply)
  }

  return balances
}
