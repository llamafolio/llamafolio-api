import { getLendingPoolBalances } from '@adapters/radiant-v2/arbitrum/lendingPool'
import { getMultiFeeDistributionContracts } from '@adapters/radiant-v2/arbitrum/multifee'
import { getMultiFeeDistributionBalancesETH } from '@adapters/radiant-v2/ethereum/multifee'
import {
  getLendingPoolContracts as getAaveLendingPoolContracts,
  getLendingPoolHealthFactor,
} from '@lib/aave/v2/lending'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import type { Token } from '@lib/token'

const lendingPoolContract: Contract = {
  name: 'LendingPool',
  displayName: 'Radiant Lending',
  chain: 'ethereum',
  address: '0xA950974f64aA33f27F6C5e017eEE93BF7588ED07',
}

const multiFeeDistributionContract: Contract = {
  name: 'MultiFeeDistribution',
  displayName: 'Radiant multiFeeDistribution',
  chain: 'ethereum',
  address: '0x28E395a54a64284DBA39652921Cd99924f4e3797',
}

const chefIncentivesControllerContract: Contract = {
  name: 'ChefIncentivesController',
  displayName: 'Radiant incentives controller',
  chain: 'ethereum',
  address: '0x14b0A611230Dc48E9cc048d3Ae5279847Bf30919',
}

const radiantToken: Token = {
  chain: 'ethereum',
  address: '0x137ddb47ee24eaa998a535ab00378d6bfa84f893',
  symbol: 'RDNT',
  decimals: 18,
}

const RDNT_ETH: Contract = {
  chain: 'ethereum',
  address: '0xcf7b51ce5755513d4be016b0e28d6edeffa1d52a',
  poolId: '0xcf7b51ce5755513d4be016b0e28d6edeffa1d52a000200000000000000000617',
  underlyings: ['0x137dDB47Ee24EaA998a535Ab00378d6BFa84F893', '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'],
}

export const getContracts = async (ctx: BaseContext) => {
  const [pools, fmtMultifeeDistributionContract] = await Promise.all([
    getAaveLendingPoolContracts(ctx, lendingPoolContract),
    getMultiFeeDistributionContracts(ctx, multiFeeDistributionContract, RDNT_ETH),
  ])

  return {
    contracts: { pools, fmtMultifeeDistributionContract },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const [balances, healthFactor] = await Promise.all([
    resolveBalances<typeof getContracts>(ctx, contracts, {
      pools: (...args) => getLendingPoolBalances(...args, chefIncentivesControllerContract, radiantToken),
      fmtMultifeeDistributionContract: (...args) =>
        getMultiFeeDistributionBalancesETH(...args, {
          multiFeeDistribution: multiFeeDistributionContract,
          lendingPool: lendingPoolContract,
          stakingToken: RDNT_ETH,
        }),
    }),
    getLendingPoolHealthFactor(ctx, lendingPoolContract),
  ])

  return {
    groups: [{ balances, healthFactor }],
  }
}
