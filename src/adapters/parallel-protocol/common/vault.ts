import type { BaseContext, Contract } from '@lib/adapter'
import { getERC20Details } from '@lib/erc20'

export async function getVaultWithAssets(
  ctx: BaseContext,
  PAR: Contract,
  vault: Contract,
  assetsAddresses: `0x${string}`[],
): Promise<Contract> {
  const assets = (await getERC20Details(ctx, assetsAddresses)) as Contract[]

  return { ...PAR, vault: vault.address, tokens: assets }
}
