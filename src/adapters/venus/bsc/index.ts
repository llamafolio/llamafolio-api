import { Adapter, GetBalancesHandler, Contract } from '@lib/adapter'
import { getMarketsContracts } from '@lib/compound/v2/lending'
import { ethers } from 'ethers'
import { Token } from '@lib/token'
import { getRewardsBalances } from '../common/rewards'
import { getLendBorrowBalances } from '../common//lend'
import { getStakeBalances } from '../common/stake'

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
  const contracts = await getMarketsContracts('bsc', {
    // Venus Unitroller
    comptrollerAddress: Comptroller.address,
    underlyingAddressByMarketAddress: {
      // cBNB -> BNB
      '0xa07c5b74c9b40447a954e1466938b865b6bbea36': ethers.constants.AddressZero,
    },
  })

  return {
    contracts: { contracts, Comptroller, VenusLens, VenusVault },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { contracts, Comptroller, VenusLens, VenusVault },
) => {
  const [stakeBalances, marketsBalances, rewardsBalances] = await Promise.all([
    getStakeBalances(ctx, 'bsc', VenusVault),
    getLendBorrowBalances(ctx, 'bsc', contracts, Comptroller),
    getRewardsBalances(ctx, 'bsc', Comptroller, VenusLens),
  ])

  return {
    balances: [...stakeBalances, ...marketsBalances, ...rewardsBalances],
  }
}
