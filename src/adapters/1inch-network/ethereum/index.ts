import type { AdapterConfig } from "@lib/adapter";import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

import { getInchFarmingPools, getInchPools } from '../common/contract'
import { getInchBalances } from '../common/farm'
import { getInchLockerBalances } from '../common/locker'
import { getLpInchBalances } from '../common/lp'
import { getInchStakingBalances } from '../common/stake'

const Inch: Token = {
  chain: 'ethereum',
  address: '0x111111111117dc0aa78b770fa6a738034120c302',
  decimals: 18,
  symbol: '1INCH',
}

const farmingPoolsAddresses: `0x${string}`[] = [
  '0x598032ba8e7acb625ea6854b4696e25afa2ec9f0',
  '0x98484d4259a70b73af58180521f2eb71a3f00ae6',
  '0x2ede375d73d81dbd19ef58a75ba359dd28d25de8',
  '0x2cb9e71a5cf989008ba93dad8edb988ec1b4182f',
  '0xeb7dbc5a64d2d083d774595e560b147c5021eacd',
  '0xe65184b402376703adc27a7d7e0e8d35a264a240',
  '0x8acdb3bcc5101b1ba8a5070f003a77a2da376fe8',
  '0x73f5e5260423a2742d9f8ac49dea6cb5eaec465e',
  '0x9070832cf729a5150bb26825c2927e7d343eabd9',
  '0x2ec255797fef7669fa243509b7a599121148ffba',
  '0x48371588e964f1e8939127af68622e32268640fa',
  '0x1055f60bbf27d233c4e34d2e03e35567427415fa',
  '0x18d410f651289bb978fc32f90d2d7e608f4f4560',
  '0x7cb203834ce6792756541d722d94296f4c1ca356',
  '0xd7012cdebf10d5b352c601563aa3a8d1795a3f52',
  '0x13927a60c7bf4d3d00e3c1593e0ec713e35d2106',
  '0x94bc2a1c732bcad7343b25af48385fe76e08734f',
  '0xe22f6a5dd9e491dfab49faefdb32d01aaf99703e',
  '0x0da1b305d7101359434d71eceaab71e1ff5437e6',
  '0x8b1af1298f5c0ca8a6b4e66626a4bdae0f7521e5',
]

const rewarders: Contract[] = [
  { chain: 'ethereum', address: '0x1583c1dbe20625d0b752d472e845fba96d096829', token: Inch.address },
  { chain: 'ethereum', address: '0x5237b096435c517ad4f809e284019882b6979b25', token: Inch.address },
  { chain: 'ethereum', address: '0x7e78a8337194c06314300d030d41eb31ed299c39', token: Inch.address },
  { chain: 'ethereum', address: '0xf46bc16a148f84be8636a8599843a3beae6a2651', token: Inch.address },
  { chain: 'ethereum', address: '0xf72909833633700cf8b7b1fb1b8264968c4790b0', token: Inch.address },
  { chain: 'ethereum', address: '0x145fbce7e461b29cc10e967680164947e77f2643', token: Inch.address },
  { chain: 'ethereum', address: '0xb0061982ce4e2225f2d59c2b821e3bf76026bea9', token: Inch.address },
  { chain: 'ethereum', address: '0x9b458c86bcc2cab2a96e22444631f0f88c388732', token: Inch.address },
  { chain: 'ethereum', address: '0xee281a9dc81f60ae53165c5a47e384cef7ae647e', token: Inch.address },
  { chain: 'ethereum', address: '0xe4ab4860548e29b9bdcd444efbab2e506acd3121', token: Inch.address },
  { chain: 'ethereum', address: '0xe7efe00c7217223df790caa50528eb02e9c9d723', token: Inch.address },
  { chain: 'ethereum', address: '0xc5396220aa03df822003ce4bf871f9c9a2baefb8', token: Inch.address },
]

const poolDeployer: Contract = {
  chain: 'ethereum',
  address: '0xbaf9a5d4b0052359326a6cdab54babaa3a3a9643',
}

const staker: Contract = {
  chain: 'ethereum',
  address: '0xa0446d8804611944f1b527ecd37d7dcbe442caba',
  decimals: 18,
  symbol: 'st1INCH',
  underlyings: [Inch.address],
}

const locker: Contract = {
  chain: 'ethereum',
  address: '0x9a0c8ff858d273f57072d714bca7411d717501d7',
  decimals: 18,
  symbol: 'st1INCH',
  underlyings: [Inch.address],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, farmingPools] = await Promise.all([
    getInchPools(ctx, poolDeployer),
    getInchFarmingPools(ctx, farmingPoolsAddresses),
  ])

  return {
    contracts: { pools, farmingPools, staker, locker },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getLpInchBalances,
    farmingPools: getInchBalances,
    staker: getInchStakingBalances,
    locker: (...args) => getInchLockerBalances(...args, rewarders),
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1612393200,
                  }
                  