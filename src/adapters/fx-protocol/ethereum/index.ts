import { getfxBalances } from '@adapters/fx-protocol/ethereum/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleLockerBalance } from '@lib/lock'

const FXN: Contract = {
  chain: 'ethereum',
  address: '0x365AccFCa291e7D3914637ABf1F7635dB165Bb09',
  symbol: 'FXN',
  decimals: 18,
}

const fETH: Contract = {
  chain: 'ethereum',
  address: '0x53805a76e1f5ebbfe7115f16f9c87c2f7e633726',
  decimals: 18,
  symbol: 'fETH',
}

const sfETH: Contract = {
  chain: 'ethereum',
  address: '0xa677d95b91530d56791fba72c01a862f1b01a49e',
  token: '0x53805a76e1f5ebbfe7115f16f9c87c2f7e633726',
}

const xETH: Contract = {
  chain: 'ethereum',
  address: '0xe063f04f280c60aeca68b38341c2eecbec703ae2',
  decimals: 18,
  symbol: 'xETH',
}

const treasury: Contract = {
  chain: 'ethereum',
  address: '0x0e5CAA5c889Bdf053c9A76395f62267E653AFbb0',
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0xec6b8a3f3605b083f7044c0f31f2cac0caf1d469',
}

export const getContracts = () => {
  return {
    contracts: { assets: [fETH, sfETH, xETH], locker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    assets: (...args) => getfxBalances(...args, treasury),
    locker: (...args) => getSingleLockerBalance(...args, FXN, 'locked'),
  })

  return {
    groups: [{ balances }],
  }
}
