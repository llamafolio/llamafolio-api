import { getVAIStakeBalance, getXVSStakeBalance } from '@adapters/venus/bsc/stake'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { BalanceWithExtraProps } from '@lib/compound/v2/lending'
import { getHealthFactor, getMarketsContracts } from '@lib/compound/v2/lending'
import { ADDRESS_ZERO } from '@lib/contract'
import type { Token } from '@lib/token'

import { getLendBorrowBalances } from './lend'
import { getRewardsBalances } from './rewards'

const XVS: Token = {
  chain: 'bsc',
  address: '0xcf6bb5389c92bdda8a3747ddb454cb7a64626c63',
  decimals: 18,
  symbol: 'XVS',
}

const VAI: Token = {
  chain: 'bsc',
  symbol: 'VAI',
  decimals: 18,
  address: '0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7',
}

const VenusLens: Contract = {
  chain: 'bsc',
  address: '0x595e9DDfEbd47B54b996c839Ef3Dd97db3ED19bA',
  underlyings: [XVS],
}

const Comptroller: Contract = {
  chain: 'bsc',
  address: '0xfD36E2c2a6789Db23113685031d7F16329158384',
  underlyings: [XVS, VAI],
}

const VAIVenusVault: Contract = {
  chain: 'bsc',
  name: 'VaiVault',
  address: '0x0667eed0a0aab930af74a3dfedd263a73994f216',
  token: VAI.address,
  rewards: [XVS],
}

const XVSVenusVault: Contract = {
  chain: 'bsc',
  name: 'VaiVault',
  address: '0x051100480289e704d20e9db4804837068f3f9204',
  token: XVS.address,
  rewards: [XVS],
}

export const getContracts = async (ctx: BaseContext) => {
  const markets = await getMarketsContracts(ctx, {
    // Venus Unitroller
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // cBNB -> BNB
      '0xa07c5b74c9b40447a954e1466938b865b6bbea36': ADDRESS_ZERO,
    },
  })

  return {
    contracts: { markets, Comptroller, VenusLens, VAIVenusVault, XVSVenusVault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    VAIVenusVault: getVAIStakeBalance,
    XVSVenusVault: getXVSStakeBalance,
    markets: (...args) => getLendBorrowBalances(...args, Comptroller),
    Comptroller: (...args) => getRewardsBalances(...args, VenusLens),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    groups: [{ balances, healthFactor }],
  }
}
