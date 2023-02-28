import { BaseContext, Contract } from '@lib/adapter'
import fetch from 'node-fetch'

const API_URL = 'https://api.badger.com/v2/vaults'

export async function getBadgerContractsFromAPI(ctx: BaseContext): Promise<Contract[]> {
  const contracts: Contract[] = []

  const response = await fetch(`${API_URL}?chain=${ctx.chain}`)
  const datas = await response.json()

  for (const data of datas) {
    if (!data) {
      continue
    }

    const {
      name,
      vaultAsset: symbol,
      tokens: underlyings,
      underlyingToken: lpToken,
      vaultToken: address,
      protocol: provider,
    } = data

    contracts.push({
      chain: ctx.chain,
      name,
      address,
      symbol,
      lpToken,
      underlyings,
      provider,
    })
  }

  for (const contract of contracts) {
    const underlyings = contract.underlyings
    if (!underlyings) {
      continue
    }

    contract.underlyings = underlyings.map((underlying) => ({
      ...(underlying as Contract),
      chain: ctx.chain,
    }))

    if (underlyings.length < 2) {
      contract.provider = undefined
    }
  }

  return contracts
}
