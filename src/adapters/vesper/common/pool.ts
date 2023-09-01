import type { BaseContext, Contract } from '@lib/adapter'

export async function getVesperStakeContracts(ctx: BaseContext, url: string): Promise<Contract[]> {
  const response = await fetch(url)
  const vaults: any[] = await response.json()

  return vaults.map((vault) => ({
    chain: ctx.chain,
    name: vault.name,
    address: vault.address,
    underlyings: [vault.collateral.address],
    rewarder: vault.rewardsContractAddress,
  }))
}
