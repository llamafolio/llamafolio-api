import { BaseContext, Contract } from '@lib/adapter'

const API_URL = 'https://api.badger.com/v2/vaults'

export async function getBadgerContractsFromAPI(ctx: BaseContext): Promise<Contract[]> {
  const response = await fetch(`${API_URL}?chain=${ctx.chain}`)
  const vaults: any[] = await response.json()

  return vaults.map((vault) => ({
    chain: ctx.chain,
    name: vault.name,
    address: vault.vaultToken,
    symbol: vault.vaultAsset,
    lpToken: vault.underlyingToken,
    underlyings: vault.tokens.map((underlying: any) => ({ ...underlying, chain: ctx.chain })),
    provider: vault.tokens?.length < 2 ? undefined : vault.protocol,
  }))
}
