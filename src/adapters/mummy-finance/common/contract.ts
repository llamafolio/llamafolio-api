import type { BaseContext, Contract } from '@lib/adapter'
import { getVaultTokens } from '@lib/gmx/vault'

const esMMY: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0x68d1ca32aee9a73534429d8376743bf222ff1870', decimals: 18, symbol: 'esMMY' },
  base: { chain: 'base', address: '0x9032aed8c1f2139e04c1ad6d9f75bdf1d6e5cf5c', decimals: 18, symbol: 'esMMY' },
  fantom: { chain: 'fantom', address: '0xe41c6c006de9147fc4c84b20cdfbfc679667343f', decimals: 18, symbol: 'esMMY' },
  optimism: { chain: 'optimism', address: '0x0d8393cea30df4fafa7f00f333a62dee451935c1', decimals: 18, symbol: 'esMMY' },
}

const MMY: { [key: string]: Contract } = {
  arbitrum: { chain: 'arbitrum', address: '0xa6d7d0e650aa40ffa42d845a354c12c2bc0ab15f', decimals: 18, symbol: 'MMY' },
  // base: { chain: 'base', address: '0x9032aed8c1f2139e04c1ad6d9f75bdf1d6e5cf5c', decimals: 18, symbol: 'MMY' },
  // fantom: { chain: 'fantom', address: '0xe41c6c006de9147fc4c84b20cdfbfc679667343f', decimals: 18, symbol: 'MMY' },
  // optimism: { chain: 'optimism', address: '0x0d8393cea30df4fafa7f00f333a62dee451935c1', decimals: 18, symbol: 'MMY' },
}

export async function getMMYLPContract(ctx: BaseContext, fMMY: Contract, vault: Contract): Promise<Contract> {
  return { ...fMMY, underlyings: (await getVaultTokens(ctx, vault)) as `0x${string}`[] }
}

export async function getMMYXContract(ctx: BaseContext, MMYX: Contract): Promise<Contract> {
  return { ...MMYX, underlyings: [esMMY[ctx.chain], MMY[ctx.chain]] }
}
