import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getMasterChefPoolsBalances } from '@lib/masterchef/masterchef'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getLockerBalances, getStakerBalances } from './balance'

const bone: Token = {
  chain: 'ethereum',
  symbol: 'BONE',
  decimals: 18,
  address: '0x9813037ee2218799597d83d4a5b6f3b6778218d9',
}

const leash: Token = {
  chain: 'ethereum',
  symbol: 'LEASH',
  decimals: 18,
  address: '0x27C70Cd1946795B66be9d954418546998b546634',
}

const shib: Token = {
  chain: 'ethereum',
  symbol: 'SHIB',
  decimals: 18,
  address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
}

const locker: Contract = {
  name: 'locker',
  displayName: 'Locker',
  chain: 'ethereum',
  address: '0xa404f66b9278c4ab8428225014266b4b239bcdc7',
}
const buryBoneStaker: Contract = {
  name: 'tBone Staked Bone ShibaSwap',
  chain: 'ethereum',
  address: '0xf7a0383750fef5abace57cc4c9ff98e3790202b3',
  symbol: 'BONE',
  decimals: 18,
  underlyings: [bone],
}

const buryLeashStaker: Contract = {
  name: 'xLeash Staked Leash',
  chain: 'ethereum',
  address: '0xa57D319B3Cf3aD0E4d19770f71E63CF847263A0b',
  symbol: 'xLEASH',
  decimals: 18,
  underlyings: [leash],
}

const shibaStaker: Contract = {
  name: 'xShib Staked Shiba Inu',
  chain: 'ethereum',
  address: '0xB4a81261b16b92af0B9F7C4a83f1E885132D81e4',
  symbol: 'xSHIB',
  decimals: 18,
  underlyings: [shib],
}

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'ethereum',
  address: '0x94235659cf8b805b2c658f9ea2d6d6ddbb17c8d7',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0x115934131916C8b277DD010Ee02de363c09d037c',
    offset,
    limit,
  })

  return {
    contracts: {
      locker,
      buryBoneStaker,
      buryLeashStaker,
      shibaStaker,
      bone,
      masterChef,
      pairs,
    },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getShibaswapPairsBalances(ctx: BalancesContext, pairs: Pair[], masterchef: Contract, rewardToken: Token) {
  return Promise.all([getPairsBalances(ctx, pairs), getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken)])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getShibaswapPairsBalances(...args, masterChef, bone),
    buryBoneStaker: getStakerBalances,
    buryLeashStaker: getStakerBalances,
    shibaStaker: getStakerBalances,
    locker: getLockerBalances,
  })
  return {
    balances,
  }
}
