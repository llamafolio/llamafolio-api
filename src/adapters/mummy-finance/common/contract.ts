import type { BaseContext, Contract } from '@lib/adapter'
import { getVaultTokens } from '@lib/gmx/vault'

const sbfMMY: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0xA30b1C3c8EDE3841dE05F9CdD4D0e097aC4C6D92' },
  base: { chain: 'base', address: '0x52cC60893d3Bd8508baAB835620CbF9ddfA0A13C' },
  fantom: { chain: 'fantom', address: '0xC52Be971c10f2Ef8d34ED7C5E997dda1705cc292' },
  optimism: { chain: 'optimism', address: '0x7B26207457A9F8fF4fd21A7A0434066935f1D8E7' },
}

const MMY: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0xa6d7d0e650aa40ffa42d845a354c12c2bc0ab15f', decimals: 18, symbol: 'MMY' },
  base: { chain: 'base', address: '0x0d8393CEa30df4fAFA7f00f333A62DeE451935C1', decimals: 18, symbol: 'MMY' },
  fantom: { chain: 'fantom', address: '0x01e77288b38b416F972428d562454fb329350bAc', decimals: 18, symbol: 'MMY' },
  optimism: { chain: 'optimism', address: '0x47536F17F4fF30e64A96a7555826b8f9e66ec468', decimals: 18, symbol: 'MMY' },
}

export async function getMMYLPContract(ctx: BaseContext, fMMY: Contract, vault: Contract): Promise<Contract> {
  return { ...fMMY, underlyings: (await getVaultTokens(ctx, vault)) as `0x${string}`[] }
}

export async function getMMYXContract(ctx: BaseContext, MMYX: Contract): Promise<Contract> {
  return { ...MMYX, underlyings: [sbfMMY[ctx.chain], MMY[ctx.chain]] }
}
