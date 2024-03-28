import type { BaseContext, Contract } from '@lib/adapter'
import { getVaultTokens } from '@lib/gmx/vault'

export async function getOpxOLPContract(ctx: BaseContext, fOLP: Contract, vault: Contract): Promise<Contract> {
  return { ...fOLP, underlyings: await getVaultTokens(ctx, vault) }
}
