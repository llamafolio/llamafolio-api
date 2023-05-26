import type { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  get_balances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
    gas: 20935,
  },
} as const

const HZN: Token = {
  chain: 'bsc',
  address: '0xc0eff7749b125444953ef89682201fb8c6a917cd',
  decimals: 18,
  symbol: 'HZN',
}

interface HorizonBalanceParams extends FarmBalance {
  pool: `0x${string}`
  factory: `0x${string}`
  token: `0x${string}`
}

export async function getHorizonFarmBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = farmers.map((farmer) => ({ target: farmer.address, params: [ctx.address] }))

  const [userBalancesRes, pendingRewardsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.earned }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const underlyings = farmer.underlyings as Contract[]
    const userBalanceRes = userBalancesRes[farmerIdx]
    const pendingRewardRes = pendingRewardsRes[farmerIdx]

    if (!isSuccess(userBalanceRes) || !isSuccess(pendingRewardRes)) {
      continue
    }

    balances.push({
      ...farmer,
      address: farmer.token!,
      amount: BigNumber.from(userBalanceRes.output),
      underlyings,
      rewards: [{ ...HZN, amount: BigNumber.from(pendingRewardRes.output) }],
      category: 'farm',
    })
  }

  const fmtBalances = await getUnderlyingBalances(ctx, balances)

  for (let i = 0; i < fmtBalances.length; i++) {
    const contractIndex = farmers.findIndex((c) => c.token! === fmtBalances[i].address)
    if (contractIndex !== -1) {
      farmers[contractIndex] = Object.assign({}, farmers[contractIndex], fmtBalances[i])
    }
  }

  await Promise.all(
    balances
      .filter((contract: Contract) => contract.provider === 'curve')
      .map(async (contract) => {
        return await getUnderlyingsCurveBalance(ctx, contract as HorizonBalanceParams)
      }),
  )

  return balances
}

const getUnderlyingsCurveBalance = async (ctx: BalancesContext, crvBalance: HorizonBalanceParams): Promise<Balance> => {
  const underlyings = crvBalance.underlyings as Contract[]

  const [underlyingsBalances, totalSupplyRes] = await Promise.all([
    call({ ctx, target: crvBalance.factory, params: [crvBalance.pool], abi: abi.get_balances }),
    call({ ctx, target: crvBalance.token!, abi: erc20Abi.totalSupply }),
  ])

  underlyings.forEach((underlying, underlyingIdx) => {
    const underlyingBalance = underlyingsBalances[underlyingIdx]
    ;(underlying as Balance).amount =
      BigNumber.from(underlyingBalance).mul(crvBalance.amount).div(totalSupplyRes) || BN_ZERO
  })

  return crvBalance
}
