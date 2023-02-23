import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'
import { groupBy } from 'lodash'

import {
  fmtBalancerProvider,
  fmtCurveProvider,
  fmtNoProvider,
  fmtProviderBalancesParams,
  fmtSolidlyProvider,
  fmtSushiProvider,
} from './utils'

const abi = {
  getPricePerFullShare: {
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getYieldBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, rateOfsRes] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: pools.map((pool) => ({ target: pool.address })), abi: abi.getPricePerFullShare }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const balanceOfRes = balanceOfsRes[poolIdx]
    const rateOfRes = rateOfsRes[poolIdx]

    if (!isSuccess(balanceOfRes) || !isSuccess(rateOfRes)) {
      continue
    }

    balances.push({
      ...pool,
      amount: BigNumber.from(balanceOfRes.output).mul(rateOfRes.output).div(utils.parseEther('1.0')),
      underlyings: pool.underlyings as Contract[],
      rewards: undefined,
      category: 'farm',
    })
  }

  return getUnderlyingsBeefyBalances(ctx, balances)
}

type Provider = (ctx: BalancesContext, pools: fmtProviderBalancesParams[]) => Promise<fmtProviderBalancesParams[]>

const getUnderlyingsBeefyBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  const balancesWithUnderlyings: Balance[] = []

  const providers: Record<string, Record<string, Provider | undefined>> = {
    ethereum: {
      solidly: fmtSolidlyProvider,
      sushi: fmtSushiProvider,
      balancer: (...args) => fmtBalancerProvider(...args, '0xba12222222228d8ba445958a75a0704d566bf2c8'),
      curve: (...args) =>
        fmtCurveProvider(...args, [{ address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC', underlyingAbi: true }]),
    },
    fantom: {
      // spookyswap: fmtSushiProvider,
      // beethovenx: (...args) => fmtBalancerProvider(...args, '0x20dd72ed959b6147912c2e529f0a0c651c33c9ce'),
      // tombswap: fmtSushiProvider,
      // curve: (...args) =>
      //   fmtCurveProvider(...args, [
      //     { address: '0x4fb93D7d320E8A263F22f62C2059dFC2A8bCbC4c', underlyingAbi: false },
      //     { address: '0x0f854EA9F38ceA4B1c2FC79047E9D0134419D5d6', underlyingAbi: true },
      //     { address: '0x686d67265703D1f124c45E33d47d794c566889Ba', underlyingAbi: true },
      //   ]),
    },
    arbitrum: {
      sushi: fmtSushiProvider,
      swapfish: fmtSushiProvider,
      curve: (...args) =>
        fmtCurveProvider(...args, [
          { address: '0x0e9fbb167df83ede3240d6a5fa5d40c6c6851e15', underlyingAbi: false },
          { address: '0x445FE580eF8d70FF569aB36e80c647af338db351', underlyingAbi: true },
          { address: '0xb17b674D9c5CB2e441F8e196a2f048A81355d031', underlyingAbi: true },
        ]),
    },
  }

  for (const pool of pools) {
    const lpToken = pool.lpToken
    const { output: poolSuppliesRes } = await call({ ctx, target: lpToken, abi: erc20Abi.totalSupply })

    pool.totalSupply = BigNumber.from(poolSuppliesRes)
  }

  const getProviderFunction = (chain: string, provider: string): Provider | undefined => {
    const chainProviders = providers[chain]
    if (!chainProviders) {
      return undefined
    }
    return chainProviders[provider] ?? fmtNoProvider
  }

  const sortedPools = groupBy(pools, 'provider')

  for (const provider of Object.keys(sortedPools)) {
    const providerFunction = getProviderFunction(ctx.chain, provider)

    if (!providerFunction) {
      continue
    }

    const providerPools = sortedPools[provider] as fmtProviderBalancesParams[]

    balancesWithUnderlyings.push(...(await providerFunction(ctx, providerPools)))
  }
  return balancesWithUnderlyings
}
