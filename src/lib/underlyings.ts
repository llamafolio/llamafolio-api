import { Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { BigNumber, ethers } from 'ethers'

import { getERC20Details } from './erc20'
import { ETH_ADDR } from './token'

const abi = {
  totalSupply: {
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

  underlyingsBalances: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_balances',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[4]' }],
  },

  getPoolFromLPToken: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: 'arg0', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
    gas: 2443,
  },

  getUnderlyingsCoins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
}

const curveMetaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export const getPoolsUnderlyings = async (chain: Chain, poolsAddresses: string[]) => {
  const getUnderlyingsAddresses = await multicall({
    chain,
    calls: poolsAddresses.map((poolAddress) => ({
      target: curveMetaRegistry.address,
      params: [poolAddress],
    })),
    abi: abi.getUnderlyingsCoins,
  })

  const underlyingsAddresses = getUnderlyingsAddresses.filter((res) => res.success).map((res) => res.output)

  const formattedUnderlyingsAddresses: any[] = []

  for (let i = 0; i < underlyingsAddresses.length; i++) {
    formattedUnderlyingsAddresses.push(
      underlyingsAddresses[i]
        .filter((underlying: string) => underlying.toLowerCase() !== ethers.constants.AddressZero)
        .map((underlying: string) =>
          underlying.toLowerCase() === ETH_ADDR ? '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' : underlying,
        ),
    )
  }

  const underlyings: any[] = []

  for (const formattedUnderlyingsAddress of formattedUnderlyingsAddresses) {
    underlyings.push(await getERC20Details(chain, formattedUnderlyingsAddress))
  }

  return underlyings
}

export async function getPoolFromLpTokenAddress(chain: Chain, lpTokens: string[]) {
  const getPoolsAddressesFromLpTokens = await multicall({
    chain,
    calls: lpTokens.map((lpToken) => ({
      target: curveMetaRegistry.address,
      params: [lpToken],
    })),
    abi: abi.getPoolFromLPToken,
  })

  return getPoolsAddressesFromLpTokens.filter((res) => res.success).map((res) => res.output)
}

export async function getUnderlyingsBalancesInPool(
  chain: Chain,
  contract: Contract,
  lpTokenAddress: string,
  poolAddress: string,
) {
  const [getTotalSupply, getUnderlyingsBalances] = await Promise.all([
    call({
      chain,
      target: lpTokenAddress,
      params: [],
      abi: abi.totalSupply,
    }),

    call({
      chain,
      target: curveMetaRegistry.address,
      params: [poolAddress],
      abi: abi.underlyingsBalances,
    }),
  ])

  const totalSupply = BigNumber.from(getTotalSupply.output)
  const underlyingsBalances: BigNumber[] = getUnderlyingsBalances.output.map((res: string) => BigNumber.from(res))

  underlyingsBalances.filter((amount) => amount.gt(0))

  /**
   *  Updating pool amounts from the fraction of each underlyings
   */

  const underlyingsFractionated = []

  if (contract.underlyings) {
    for (let i = 0; i < contract.underlyings.length; i++) {
      const underlyingBalance = BigNumber.from(getUnderlyingsBalances.output[i])

      const underlyings = contract.underlyings[i]

      underlyingsFractionated.push({
        chain,
        address: underlyings.address,
        symbol: underlyings.symbol,
        amount: contract.amount.mul(underlyingBalance).div(totalSupply),
        decimals: underlyings.decimals,
      })
    }
  }
  return underlyingsFractionated
}
