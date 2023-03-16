import { BaseContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'

import { IPools } from '.'

const abi = {
  poolToken: {
    inputs: [],
    name: 'poolToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const ILV: Token = {
  chain: 'ethereum',
  address: '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
  decimals: 18,
  symbol: 'ILV',
}

export async function getILVContracts(ctx: BaseContext, pools: IPools[]): Promise<Contract[]> {
  const contracts: Contract[] = []

  const poolTokensRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address })),
    abi: abi.poolToken,
  })

  const [decimalsRes, symbolsRes] = await Promise.all([
    multicall({
      ctx,
      calls: poolTokensRes.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
      abi: erc20Abi.decimals,
    }),
    multicall({
      ctx,
      calls: poolTokensRes.map((pool) => (isSuccess(pool) ? { target: pool.output } : null)),
      abi: erc20Abi.symbol,
    }),
  ])

  pools.forEach(async (pool, poolIdx) => {
    const poolTokenRes = poolTokensRes[poolIdx]
    const decimalRes = decimalsRes[poolIdx]
    const symbolRes = symbolsRes[poolIdx]

    if (!isSuccess(poolTokenRes) || !isSuccess(decimalRes) || !isSuccess(symbolRes)) {
      return
    }

    const contract: Contract = {
      chain: ctx.chain,
      address: pool.address,
      decimals: decimalRes.output,
      symbol: symbolRes.output,
      provider: pool.provider,
      lpToken: poolTokenRes.output,
      rewards: [ILV],
    }

    switch (contract.provider) {
      case 'illuvium':
        contract.underlyings = [poolTokenRes.output]
        contracts.push(contract)
        break

      case 'sushi':
        contract.underlyings = [
          '0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E',
          '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        ]
        contracts.push(contract)
        break

      case 'xyz':
        contract.underlyings = ['0x618679dF9EfCd19694BB1daa8D00718Eacfa2883']
        contracts.push(contract)
        break

      default:
        break
    }
  })

  return contracts
}
