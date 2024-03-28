import { getOlpStakeBalance } from '@adapters/opx-finance/optimism/balance'
import { getOpxOLPContract } from '@adapters/opx-finance/optimism/contract'
import { getOPXLockerBalance } from '@adapters/opx-finance/optimism/locker'
import type { AdapterConfig, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const vault: Contract = {
  chain: 'optimism',
  address: '0xb94C36A74c8504Dea839C119aeaF2e615364253F',
}

const fOLP: Contract = {
  chain: 'optimism',
  address: '0x48ea422cb9b3aac769e30ce1fb9e7bf1de480656',
}

const locker: Contract = {
  chain: 'optimism',
  address: '0x47a2d5c7cd40a1154f0c258fe3e08212b322e2c7',
  token: '0xcdb4bb51801a1f399d4402c61bc098a72c382e65',
}

export const getContracts = async (ctx: BaseContext) => {
  const olp = await getOpxOLPContract(ctx, fOLP, vault)

  return {
    contracts: { olp, locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    olp: (...args) => getOlpStakeBalance(...args, vault),
    locker: getOPXLockerBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1667779200,
}
