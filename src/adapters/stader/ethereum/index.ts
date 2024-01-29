import { getSDCollateralBalance } from '@adapters/stader/ethereum/stake'
import type { AdapterConfig, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const ETHx: Contract = {
  chain: 'ethereum',
  address: '0xa35b1b31ce002fbf2058d22f30f95d405200a15b',
  decimals: 18,
  symbol: 'ETHx',
}

const SDCollateralContract: Contract = {
  chain: 'ethereum',
  address: '0x7af4730cc8ebad1a050dcad5c03c33d2793ee91f',
  token: '0x30d20208d987713f46dfd34ef128bb16c404d10f',
}

export const getContracts = () => {
  return {
    contracts: { ETHx, SDCollateralContract },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    ETHx: getSingleStakeBalance,
    SDCollateralContract: getSDCollateralBalance,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1660176000,
}
