import { getQidaoVaultsBalances } from '@adapters/qidao/common/balance'
import { getQidaoVaults } from '@adapters/qidao/common/vault'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vaultsAddresses: `0x${string}`[] = [
  '0x1066b8FC999c1eE94241344818486D5f944331A0',
  '0x7efB260662a6FA95c1CE1092c53Ca23733202798',
  '0x682E473FcA490B0adFA7EfE94083C1E63f28F034',
  '0xD939c268C49c442F037E968F045ba02f499562D4',
  '0xE5996a2cB60eA57F03bf332b5ADC517035d8d094',
  '0x267bDD1C19C932CE03c7A62BBe5b95375F9160A6',
  '0xd6488d586E8Fcd53220e4804D767F19F5C846086',
  '0xdB09908b82499CAdb9E6108444D5042f81569bD9',
  '0x3609A304c6A41d87E895b9c1fd18c02ba989Ba90',
  '0xC1c7eF18ABC94013F6c58C6CdF9e829A48075b4e',
  '0x5563Cc1ee23c4b17C861418cFF16641D46E12436',
  '0x8e5e4D08485673770Ab372c05f95081BE0636Fa2',
  '0xBf0ff8ac03f3E0DD7d8faA9b571ebA999a854146',
  // "0x051b82448a521bC32Ac7007a7A76F9dEC80F6BA2",
  // "0xD60FBaFc954Bfbd594c7723C980003c196bDF02F",
  // "0xCB99178C671761482097F32595cb79fb28a49Fd8",
  '0x7aE52477783c4E3e5c1476Bbb29A8D029c920676',
  '0x571F42886C31f9b769ad243e81D06D0D144BE7B4',
  '0x6d6029557a06961aCC5F81e1ffF5A474C54e32Fd',
  '0x3f6cf10e85e9c0630856599fab8d8bfcd9c0e7d4',
  '0x75D4aB6843593C111Eeb02Ff07055009c836A1EF',
  // "0xf18F4847a5Db889B966788dcbDbcBfA72f22E5A6",
  // "0xedF25e618E4946B05df1E33845993FfEBb427A0F",
  '0xF34e271312e41Bbd7c451B76Af2AF8339D6f16ED',
  '0x7aE52477783c4E3e5c1476Bbb29A8D029c920676',
  '0x571F42886C31f9b769ad243e81D06D0D144BE7B4',
  '0x6d6029557a06961aCC5F81e1ffF5A474C54e32Fd',
]

export const getContracts = async (ctx: BaseContext) => {
  const vaults = await getQidaoVaults(ctx, vaultsAddresses)
  return {
    contracts: { vaults },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [vaultsBalancesGroups, balances] = await Promise.all([
    getQidaoVaultsBalances(ctx, contracts.vaults || []),
    resolveBalances<typeof getContracts>(ctx, contracts, {}),
  ])

  return {
    groups: [...vaultsBalancesGroups, { balances }],
  }
}
export const config: AdapterConfig = {
  startDate: 1634342400,
}
