import { getFarmContracts, getSommelierFarmBalances } from '@adapters/sommelier/ethereum/farm'
import { getLockerContracts, getSommelierLockBalances } from '@adapters/sommelier/ethereum/locker'
import { getSommelierStakeBalances, getStakeContracts } from '@adapters/sommelier/ethereum/stake'
import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stakeAddresses: `0x${string}`[] = [
  '0x6b7f87279982d919bbf85182ddeab179b366d8f2',
  '0x6e2dac3b9e9adc0cbbae2d0b9fd81952a8d33872',
  '0x7bad5df5e11151dc5ee1a648800057c5c934c0d5',
  '0x3f07a84ecdf494310d397d24c1c78b041d2fa622',
  '0x4986fd36b6b16f49b43282ee2e24c5cf90ed166d',
  '0x05641a27c82799aaf22b436f20a3110410f29652',
  '0x6f069f711281618467dae7873541ecc082761b33',
]

const lockersAddresses: `0x${string}`[] = [
  '0x955a31153e6764fe892757ace79123ae996b0afb',
  '0x1eff374fd9aa7266504144da861fff9bbd31828e',
  '0x69374d81fdc42add0fe1dc655705e40b51b6681b',
  '0x6e5bb558d6c33ca45dc9efe0746a3c80bc3e70e1',
  '0x290a42e913083edf5aefb241f8a12b306c19f8f9',
  '0xb1d3948f4dcd7aa5e89449080f3d88870ad0137a',
  '0x8510f22bd1932afb4753b6b3edf5db00c7e7a748',
  '0x0349b3c56adb9e39b5d75fc1df52eee313dd80d1',
  '0x9eeabfff5d15e8cedfd2f6c914c8826ba0a5fbbd',
  '0x24691a00779d375a5447727e1610d327d04b3c5f',
  '0x6ce314c39f30488b4a86b8892c81a5b7af83e337',
  '0xae0e6024972b70601bc35405479af5cd372cc956',
  '0x7da7e27e4bcc6ec8bc06349e1cef6634f6df7c5c',
  '0x74a9a6fab61e128246a6a5242a3e96e56198cbdd',
  '0xd1d02c16874e0714fd825213e0c13eab6dd9c25f',
]

const farmersAddresses: `0x${string}`[] = [
  '0xb5b29320d2Dde5BA5BAFA1EbcD270052070483ec',
  '0xfd6db5011b171b05e1ea3b92f9eacaeeb055e971',
  '0x0274a704a6D9129F90A62dDC6f6024b33EcDad36',
  '0xd33dAd974b938744dAC81fE00ac67cb5AA13958E',
  '0x0C190DEd9Be5f512Bd72827bdaD4003e9Cc7975C',
  '0xDBe19d1c3F21b1bB250ca7BDaE0687A97B5f77e6',
  '0x6c51041A91C91C86f3F08a72cB4D3F67f1208897',
  '0x97e6E0a40a3D02F12d1cEC30ebfbAE04e37C119E',
  '0x03df2A53Cbed19B824347D6a45d09016C2D1676a',
  '0x7bAD5DF5E11151Dc5Ee1a648800057C5c934c0d5',
  '0x3F07A84eCdf494310D397d24c1C78B041D2fa622',
  '0x05641a27C82799AaF22b436F20A3110410f29652',
  '0x6F069F711281618467dAe7873541EcC082761B33',
  '0x4986fD36b6b16f49b43282Ee2e24C5cF90ed166d',
  '0x4068bdd217a45f8f668ef19f1e3a1f043e4c4934',
  '0x5195222f69c5821f8095ec565e71e18ab6a2298f',
  '0x18ea937aba6053bc232d9ae2c42abe7a8a2be440',
  '0x6a6af5393dc23d7e3db28d28ef422db7c40932b6',
  '0xcbf2250f33c4161e18d4a2fa47464520af5216b5',
]

export const getContracts = async (ctx: BaseContext) => {
  const [stakers, farmers, lockers] = await Promise.all([
    getStakeContracts(ctx, stakeAddresses),
    getFarmContracts(ctx, farmersAddresses),
    getLockerContracts(ctx, lockersAddresses),
  ])

  return {
    contracts: {
      stakers,
      farmers,
      lockers,
    },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    stakers: getSommelierStakeBalances,
    farmers: getSommelierFarmBalances,
    lockers: getSommelierLockBalances,
  })

  return {
    groups: [{ balances }],
  }
}
