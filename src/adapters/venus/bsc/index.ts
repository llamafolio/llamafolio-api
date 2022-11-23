import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { BalanceWithExtraProps, getHealthFactor, getMarketsContracts } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'
import { ethers } from 'ethers'

import { getLendBorrowBalances } from './lend'
import { getRewardsBalances } from './rewards'
import { getStakeBalances } from './stake'

const XVSToken: Token = {
  chain: 'bsc',
  address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
  decimals: 18,
  symbol: 'XVS',
}

const VAIToken: Token = {
  chain: 'bsc',
  symbol: 'VAI',
  decimals: 18,
  address: '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7',
}

const VenusLens: Contract = {
  chain: 'bsc',
  address: '0x595e9DDfEbd47B54b996c839Ef3Dd97db3ED19bA',
  underlyings: [XVSToken],
}

const Comptroller: Contract = {
  chain: 'bsc',
  address: '0xfD36E2c2a6789Db23113685031d7F16329158384',
  underlyings: [XVSToken, VAIToken],
}

const VenusVault: Contract = {
  chain: 'bsc',
  name: 'VaiVault',
  address: '0x0667eed0a0aab930af74a3dfedd263a73994f216',
  underlyings: [VAIToken],
  rewards: [XVSToken],
}

export const getContracts = async () => {
  const markets = await getMarketsContracts('bsc', {
    // Venus Unitroller
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // cBNB -> BNB
      '0xa07c5b74c9b40447a954e1466938b865b6bbea36': ethers.constants.AddressZero,
    },
  })

  return {
    contracts: { markets, Comptroller, VenusLens, VenusVault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'bsc', contracts, {
    VenusVault: getStakeBalances,
    markets: (...args) => getLendBorrowBalances(...args, Comptroller),
    Comptroller: (...args) => getRewardsBalances(...args, VenusLens),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    balances,
    healthFactor,
  }
}
