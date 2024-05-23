import { getPendleBalances } from '@adapters/pendle/common/balance'
import { getPendlePools } from '@adapters/pendle/common/pool'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { parseEther } from 'viem'

const abi = {
  getRate: {
    inputs: [],
    name: 'getRate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getSwellBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const [balanceOfs, rates] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address }) as const),
      abi: abi.getRate,
    }),
  ])

  return balanceOfs
    .map((balanceOf, index) => {
      const rate = rates[index]
      if (!rate.success || !balanceOf.success) return null
      const amount = (balanceOf.output * rate.output) / parseEther('1.0')
      return {
        ...contracts[index],
        amount: balanceOf.output,
        underlyings: [{ ...WETH, amount }],
        rewards: undefined,
        balanceUSD: amount * BigInt(3500),
        category: 'farm' as Category,
      }
    })
    .filter(isNotNullish)
}

const SimpleStakingERC20 = {
  stakedBalances: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'contract IERC20', name: '', type: 'address' },
    ],
    name: 'stakedBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  } as const,
}

// This is the contract where users predeposit their tokens for Swell L2
const depositContract = '0x38d43a6cb8da0e855a42fb6b0733a0498531d774'

export async function getSwellL2Balances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  return getSwellL2BalancesPendle(ctx, contracts)
}

/**
 * This function is used to get the balances of the user in the Pendle pools in the Swell L2 contract
 * We first get the staked balances of the user in the deposit contract.
 * Then we get the list of pt from pendle pools that the user could stake in.
 * Finally we set the balances of the user in the pendle pools and return them.
 * @param ctx
 * @param contracts
 * @returns
 */

async function getSwellL2BalancesPendle(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const userStakedBalances = (
    await Promise.all([
      multicall({
        ctx,
        calls: contracts.map((contract) => ({
          target: depositContract,
          params: [ctx.address, contract.address] as any,
        })),
        abi: SimpleStakingERC20.stakedBalances,
      }),
    ])
  )[0].filter((balance) => balance.success && balance.output > BigInt(0))
  const tokenWithBalance = userStakedBalances.map((balance) => {
    return balance.input.params[1]
  })
  const pendlePools = (await getPendlePools(ctx)).filter((pool) => tokenWithBalance.includes(pool.address))

  const depositContractCTX = ctx
  depositContractCTX.address = depositContract
  const balances = (await getPendleBalances(depositContractCTX, pendlePools))[1]

  const updatedBalances = balances.map((balance) => {
    const stakedBalance = userStakedBalances.find((stakedBalance) => stakedBalance.input.params[1] === balance.address)
    const amount = stakedBalance && stakedBalance.output ? stakedBalance.output : BigInt(0)
    return { ...balance, amount }
  })
  return updatedBalances
}
