import { BigNumber } from 'ethers'
import { multicall } from '@lib/multicall'
import { Chain } from '@defillama/sdk/build/general'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@defillama/sdk/build/abi'
import { range } from '@lib/array'
import { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import { BalanceWithExtraProps, getCurveBalances } from './helper'
import { getERC20BalanceOf } from '@lib/erc20'

export async function getGaugesContracts(chain: Chain, pools: Contract[], gaugeController?: Contract) {
  const gauges: Contract[] = []

  if (!gaugeController) {
    console.log('Missing gauge controller contract')

    return []
  }

  try {
    const typeGauges: any = {
      0: 'ethereum',
      1: 'fantom',
      2: 'polygon',
      4: 'xDai',
      5: 'ethereum', // (crypto pools),
      7: 'arbitrum',
      8: 'avalanche',
      9: 'harmony',
      11: 'optimism',
    }

    const gaugeContractsCountRes = await call({
      chain,
      target: gaugeController.address,
      params: [],
      abi: {
        name: 'n_gauges',
        outputs: [
          {
            type: 'int128',
            name: '',
          },
        ],
        inputs: [],
        stateMutability: 'view',
        type: 'function',
      },
    })

    const gaugeContractsAddressesRes = await multicall({
      chain,
      calls: range(0, gaugeContractsCountRes.output).map((i) => ({
        target: gaugeController.address,
        params: [i],
      })),
      abi: {
        name: 'gauges',
        outputs: [
          {
            type: 'address',
            name: '',
          },
        ],
        inputs: [
          {
            type: 'uint256',
            name: 'arg0',
          },
        ],
        stateMutability: 'view',
        type: 'function',
        gas: 2160,
      },
    })

    const gaugeContractsAddresses = gaugeContractsAddressesRes.filter((res) => res.success).map((res) => res.output)

    const gaugesTypesRes = await multicall({
      chain,
      calls: gaugeContractsAddresses.map((address) => ({
        target: gaugeController.address,
        params: [address],
      })),
      abi: {
        name: 'gauge_types',
        outputs: [
          {
            type: 'int128',
            name: '',
          },
        ],
        inputs: [
          {
            type: 'address',
            name: '_addr',
          },
        ],
        stateMutability: 'view',
        type: 'function',
        gas: 1625,
      },
    })

    const gaugesTypes = gaugesTypesRes.filter((res) => res.success).map((res) => res.output)

    for (let i = 0; i < gaugesTypesRes.length; i++) {
      if ((typeGauges[gaugesTypes[i]] as any) === chain) {
        gauges.push({ chain, address: gaugeContractsAddresses[i] })
      }
    }

    const lpTokensAddressesRes = await multicall({
      chain,
      calls: gauges.map((gauge) => ({
        target: gauge.address,
        params: [],
      })),
      abi: {
        stateMutability: 'view',
        type: 'function',
        name: 'lp_token',
        inputs: [],
        outputs: [
          {
            name: '',
            type: 'address',
          },
        ],
      },
    })

    const lpTokensAddresses = lpTokensAddressesRes.map((res) => res.output)

    gauges.map((gauge, i) => {
      gauge.lpToken = lpTokensAddresses[i]
    })

    const poolByAddress: { [key: string]: Contract } = {}
    for (const pool of pools) {
      poolByAddress[pool.address.toLowerCase()] = pool
    }

    return gauges
      .map((gauge, i) => {
        if (!lpTokensAddresses[i]) {
          return null
        }

        const pool = poolByAddress[lpTokensAddresses[i].toLowerCase()]

        if (!pool) {
          return null
        }

        return {
          ...gauge,
          lpToken: lpTokensAddresses[i],
          tokens: pool.tokens,
          underlyings: pool.underlyings,
          poolAddress: pool.poolAddress,
        }
      })
      .filter(isNotNullish)
  } catch (error) {
    console.log('Failed to get gauges contracts')

    return []
  }
}

export async function getGaugesBalances(ctx: BaseContext, chain: Chain, contracts: Contract[], registry?: Contract) {
  const balances: Balance[] = []

  if (!registry) {
    console.log('Missing registry contract')

    return []
  }

  try {
    const nonEmptyPools: Contract[] = (await getERC20BalanceOf(ctx, chain, contracts as Token[])).filter((pool) =>
      pool.amount.gt(0),
    )

    const getGaugesBalances = await getCurveBalances(ctx, chain, nonEmptyPools, registry)

    const claimableCurveTokensRes = await multicall({
      chain,
      calls: getGaugesBalances.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
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
    })

    const claimableCurveTokens = claimableCurveTokensRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output))

    for (let i = 0; i < getGaugesBalances.length; i++) {
      const gauge = getGaugesBalances[i]

      if (!registry.rewards?.[0]) {
        return []
      }

      const balance: BalanceWithExtraProps = {
        ...gauge,
        poolAddress: nonEmptyPools[i].poolAddress,
        lpToken: nonEmptyPools[i].lpToken,
        rewards: [{ ...registry.rewards?.[0], amount: claimableCurveTokens[i] }],
        yieldKey: nonEmptyPools[i].lpToken,
        category: 'farm',
      }
      balances.push(balance)
    }
    return balances
  } catch (error) {
    console.log('Failed to get gauges balances')

    return []
  }
}
