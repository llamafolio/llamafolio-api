import { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { BalanceWithExtraProps, getHealthFactor } from '@lib/compound/v2/lending'
import { Token } from '@lib/token'

import { getAssetsContracts, getLendBorrowBalances } from '../common/lend'
import { getRewardBalances } from '../common/rewards'
import { getStakeBalances } from '../common/stake'

const USDC: Token = {
  chain: 'ethereum',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  decimals: 6,
  symbol: 'USDC',
}

const CompoundUSDCv3: Contract = {
  chain: 'ethereum',
  address: '0xc3d688B66703497DAA19211EEdff47f25384cdc3',
  underlyings: [USDC],
}

const CompoundRewards: Contract = {
  chain: 'ethereum',
  address: '0x1B0e765F6224C21223AeA2af16c1C46E38885a40',
}

export const getContracts = async () => {
  const assets = await getAssetsContracts('ethereum', CompoundUSDCv3)

  return {
    contracts: { CompoundUSDCv3, assets, CompoundRewards },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    CompoundUSDCv3: getStakeBalances,
    assets: (...args) => getLendBorrowBalances(...args, CompoundUSDCv3),
    CompoundRewards: (...args) => getRewardBalances(...args, CompoundUSDCv3),
  })

  const healthFactor = await getHealthFactor(balances as BalanceWithExtraProps[])

  return {
    balances,
    ethereum: {
      healthFactor,
    },
  }
}
