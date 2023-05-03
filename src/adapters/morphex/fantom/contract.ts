import type { BaseContext, Contract } from '@lib/adapter'
import { getVaultTokens } from '@lib/gmx/vault'

export async function getMorphexContract(ctx: BaseContext, contract: Contract, vault: Contract): Promise<Contract> {
  return {
    ...contract,
    underlyings: await getVaultTokens(ctx, vault),
  }
}
