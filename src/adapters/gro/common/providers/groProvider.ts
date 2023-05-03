import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'

export async function getGroProvider(_ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  for (const contract of contracts) {
    contract.underlyings = [contract.address]
  }

  return contracts
}

export async function getGroProviderBalances(_ctx: BalancesContext, contracts: Balance[]): Promise<Balance[]> {
  return contracts
}
