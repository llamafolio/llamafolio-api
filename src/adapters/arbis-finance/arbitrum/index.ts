import { getArbisPairsBalances } from '@adapters/arbis-finance/arbitrum/pair'
import { getArbisVaults } from '@adapters/arbis-finance/arbitrum/vault'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x47a156668F1Ecc659Efbbf4910508Ace1b46a49b',
  '0xdc2d66044e894d0726570bdc03d2123ab8f2cd51',
  '0x5ec477eda75303450a4185b3557c2c2fbb85a9fc',
  '0x69f9a2eF122180366108583F2032DfB2030D8F96',
  '0x374e9F3AFFB6a2c3E388aA69c21D925C193aF13a',
  '0x1922c36f3bc762ca300b4a46bb2102f84b1684ab',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getArbisVaults(ctx, vaultsAddresses)
  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    vaults: getArbisPairsBalances,
  })

  return {
    groups: [{ balances }],
  }
}
