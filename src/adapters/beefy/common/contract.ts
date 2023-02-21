import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

export async function getBeefyContracts(ctx: BaseContext): Promise<Contract[]> {
  const contracts: Contract[] = []

  const response = await fetch(`https://api.beefy.finance/vaults/${ctx.chain}`)
  const datas = await response.json()

  for (const data of datas) {
    if (!data) {
      continue
    }

    const {
      chain,
      tokenAddress: lpToken,
      name: symbol,
      tokenDecimals: decimals,
      assets: underlyings,
      strategy,
      earnContractAddress: address,
    } = data

    contracts.push({
      chain,
      address,
      decimals,
      symbol,
      lpToken,
      strategy,
      underlyings,
      rewards: undefined,
    })
  }

  return getUnderlyingsFromBeefyApi(ctx, contracts)
}

const getUnderlyingsFromBeefyApi = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const response = await fetch(`https://api.beefy.finance/tokens/${ctx.chain}`)
  const tokens = await response.json()

  for (const pool of pools) {
    const underlyings = pool.underlyings

    if (!underlyings) {
      continue
    }

    for (let i = 0; i < underlyings.length; i++) {
      const underlying = underlyings[i] as string
      const token = tokens[underlying]
      if (token) {
        underlyings[i] = token
      }
    }
  }

  return pools
}
