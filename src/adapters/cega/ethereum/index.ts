import { getCegaContracts } from '@adapters/cega/ethereum/contract'
import { getCegaBalances } from '@adapters/cega/ethereum/farm'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultAddresses: `0x${string}`[] = [
  '0x80ec1c0da9bfbb8229a1332d40615c5ba2abbea8',
  '0xcf81b51aecf6d88df12ed492b7b7f95bbc24b8af',
  '0xab8631417271dbb928169f060880e289877ff158',
  '0x56f00a399151ec74cf7be8dc38225363e84975e6',
  '0x042021d59731d3ffa908c7c4211177137ba362ea',
  '0x94c5d3c2fe4ef2477e562eee7cccf07ee273b108',
  '0x784e3c592a6231d92046bd73508b3aae3a7cc815',
  '0xf27952993b17bd60d3c03f64d70ec2613808344f',
  '0xf28a95ecb99a8dd56fe6846cbe9acf8d97158e07',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getCegaContracts(ctx, vaultAddresses)

  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getCegaBalances,
  })

  return {
    groups: [{ balances }],
  }
}
