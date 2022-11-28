import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber, ethers } from 'ethers'

import { getPoolsContracts } from '../ethereum/pools'
import { getRegistries } from './registries'

interface PoolsContracts extends Contract {
  lpToken: string
  poolAddress: string
  tokens: string[]
  gaugeAddress: string
}

interface PoolBalances extends Balance {
  tokens: Token[]
}

export async function getFarmPoolsContracts(
  chain: Chain,
  provider: Contract,
  gaugeController: Contract,
): Promise<PoolsContracts[]> {
  const registry = await getRegistries(chain, provider)
  const pools = await getPoolsContracts(chain, registry)

  const contracts: PoolsContracts[] = []

  const getGaugesAddresses = await multicall({
    chain,
    calls: pools.map((pool) => ({
      target: gaugeController.address,
      params: [pool.lpToken],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'get_gauge_from_lp_token',
      inputs: [{ name: 'arg0', type: 'address' }],
      outputs: [{ name: '', type: 'address' }],
    },
  })

  const gaugesAddresses = getGaugesAddresses.filter((res) => res.success).map((res) => res.output)

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const gaugeAddress = gaugesAddresses[i]

    if (gaugeAddress !== ethers.constants.AddressZero)
      contracts.push({
        chain,
        address: gaugeAddress,
        lpToken: pool.lpToken,
        poolAddress: pool.poolAddress,
        tokens: pool.tokens,
        underlyings: pool.underlyings,
        gaugeAddress,
      })
  }

  return contracts
}

export async function getFarmPoolsBalances(ctx: BaseContext, chain: Chain, pools: PoolsContracts[], rewards: Token) {
  const nonZeroPools = (await getERC20BalanceOf(ctx, chain, pools as Token[])).filter((res) => res.amount.gt(0))

  return await getUnderlyingsBalances(ctx, chain, nonZeroPools, rewards)
}

const getUnderlyingsBalances = async (
  ctx: BaseContext,
  chain: Chain,
  pools: any[],
  rewards: Token,
): Promise<PoolBalances[]> => {
  const balances: PoolBalances[] = []

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]

    const [getTotalSupply, getUnderlyingsBalances, getClaimableRewards] = await Promise.all([
      call({
        chain,
        target: pool.lpToken,
        params: [],
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'totalSupply',
          inputs: [],
          outputs: [
            {
              name: '',
              type: 'uint256',
            },
          ],
          gas: 3240,
        },
      }),

      multicall({
        chain,
        calls: range(0, pool.underlyings.length).map((i) => ({
          target: pool.poolAddress,
          params: [i],
        })),
        abi: {
          stateMutability: 'view',
          type: 'function',
          name: 'balances',
          inputs: [{ name: 'arg0', type: 'uint256' }],
          outputs: [{ name: '', type: 'uint256' }],
          gas: 3993,
        },
      }),

      call({
        chain,
        target: pool.address,
        params: [ctx.address],
        abi: {
          stateMutability: 'nonpayable',
          type: 'function',
          name: 'claimable_tokens',
          inputs: [
            {
              name: 'addr',
              type: 'address',
            },
          ],
          outputs: [
            {
              name: '',
              type: 'uint256',
            },
          ],
          gas: 2683603,
        },
      }),
    ])

    const underlyings = await getERC20Details(chain, pool.underlyings)
    const totalSupply = BigNumber.from(getTotalSupply.output)
    const underlyingsBalances = getUnderlyingsBalances.filter((res) => res.success).map((res) => res.output)
    const claimableRewards = BigNumber.from(getClaimableRewards.output)

    const formattedUnderlyings = underlyings.map((underlying, x) => ({
      ...underlying,
      amount: underlying.decimals && pool.amount.mul(underlyingsBalances[x]).div(totalSupply),
      decimals: underlying.decimals,
    }))

    balances.push({
      chain,
      address: pool.address,
      amount: pool.amount,
      decimals: 18,
      symbol: underlyings.map((underlying) => underlying.symbol).join('-'),
      tokens: underlyings.map((underlying) => underlying),
      underlyings: formattedUnderlyings,
      rewards: [{ ...rewards, amount: claimableRewards }],
      category: 'farm',
    })
  }

  return balances
}
