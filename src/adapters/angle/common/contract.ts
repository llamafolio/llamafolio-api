import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

const API_URL = 'https://api.angle.money/v1/pools'

export async function getPoolContractsFromAPI(ctx: BaseContext, chainId: number): Promise<Contract[]> {
  const contracts: Contract[] = []

  const response = await fetch(`${API_URL}?chainId=${chainId}`)
  const datas = await response.json()

  const keys = Object.keys(datas)

  for (const key of keys) {
    const data = datas[key]
    if (!data) {
      continue
    }

    const { collateralAddress: underlyings, sanTokenAddress: address, liquidityGaugeAddress: gauge } = data

    contracts.push({
      chain: ctx.chain,
      address,
      underlyings: [underlyings],
      gauge,
      rewards: ['0x31429d1856aD1377A8A0079410B297e1a9e214c2'],
    })
  }

  return contracts
}
