import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

import {
  fmtBalancerProvider,
  fmtCurveProvider,
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

const providers: Record<string, Record<string, Provider | undefined>> = {
  ethereum: {
    solidly: fmtSolidlyProvider,
    sushi: fmtSushiProvider,
    balancer: (...args) => fmtBalancerProvider(...args, '0xba12222222228d8ba445958a75a0704d566bf2c8'),
    curve: (...args) =>
      fmtCurveProvider(...args, [{ address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC', underlyingAbi: true }]),
  },
  arbitrum: {
    // TODO: List all providers used on arbitrum and other altchains
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

type Provider = (ctx: BalancesContext, pools: fmtProviderBalancesParams[]) => Promise<fmtProviderBalancesParams[]>

const getUnderlyingsBeefyBalances = async (ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> => {
  // add totalSupply
  const totalSuppliesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.lpToken })),
    abi: erc20Abi.totalSupply,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const totalSupplyRes = totalSuppliesRes[poolIdx]
    if (isSuccess(totalSupplyRes)) {
      pools[poolIdx].totalSupply = BigNumber.from(totalSupplyRes.output)
    }
  }

  // resolve underlyings
  const poolsByProvider = groupBy(pools, 'provider')

  return (
    await Promise.all(
      Object.keys(poolsByProvider).map((providerId) => {
        const providerFn = providers[ctx.chain]?.[providerId]
        if (!providerFn) {
          return poolsByProvider[providerId] as Balance[]
        }

        return providerFn(ctx, poolsByProvider[providerId] as fmtProviderBalancesParams[])
      }),
    )
  ).flat()
}
