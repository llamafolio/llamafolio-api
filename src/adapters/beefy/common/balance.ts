import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  balanceOfPool: {
    inputs: [],
    name: 'balanceOfPool',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

interface getBeefyBalancesParams extends Balance {
  poolSupply: BigNumber
  lpToken: string
}

export async function getBeefyBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: getBeefyBalancesParams[] = []

  const calls: Call[] = []
  const totalSupplies: Call[] = []

  for (const pool of pools) {
    calls.push({ target: pool.address, params: [ctx.address] })
    totalSupplies.push({ target: pool.strategy })
  }

  const [balanceOfsRes, balanceOfResInPoolsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: totalSupplies, abi: abi.balanceOfPool }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const underlyings = pool.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[poolIdx]
    const balanceOfResInPoolRes = balanceOfResInPoolsRes[poolIdx]

    if (!isSuccess(balanceOfRes) || !isSuccess(balanceOfResInPoolRes)) {
      continue
    }

    balances.push({
      ...pool,
      lpToken: pool.lpToken,
      amount: BigNumber.from(balanceOfRes.output),
      decimals: 18,
      underlyings,
      poolSupply: BigNumber.from(balanceOfResInPoolRes.output),
      rewards: undefined,
    })
  }

  const test = await getUnderlyingsBeefyInPools(ctx, balances)

  // return getUnderlyingsBeefyInPools(ctx, balances)
}

const getUnderlyingsBeefyInPools = async (ctx: BalancesContext, pools: getBeefyBalancesParams[]) => {
  const balances: getBeefyBalancesParams[] = []

  for (const pool of pools) {
    const { underlyings, amount, lpToken, poolSupply } = pool

    if (!underlyings || !lpToken || !amount.gt(0) || !poolSupply.gt(0)) {
      continue
    }

    const calls = underlyings.map((underlying) => ({ target: underlying.address, params: [lpToken] }))
    const underlyingsBalancesRes = await multicall({ ctx, calls, abi: erc20Abi.balanceOf })

    underlyings.map((underlying, underlyingIdx) => {
      const underlyingsBalance = underlyingsBalancesRes[underlyingIdx]

      if (isSuccess(underlyingsBalance)) {
        ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output).mul(amount).div(poolSupply)

        console.log(underlying)

        // ;(underlying as Balance).amount = BigNumber.from(underlyingsBalance.output).mul(amount).div(poolSupply)
      }
    })
  }
}
