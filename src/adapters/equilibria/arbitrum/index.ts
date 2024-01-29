import type { AdapterConfig } from "@lib/adapter";import { getEqPoolBalances, getSingleEqBalance } from '@adapters/equilibria/common/balance'
import { getEqLockerBalance, getxEqbLockerBalances } from '@adapters/equilibria/common/lock'
import { getEqPoolsContracts } from '@adapters/equilibria/common/pool'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const ePendle: Contract = {
  chain: 'arbitrum',
  address: '0x71e0ce200a10f0bbfb9f924fe466acf0b7401ebf',
  token: '0xd4848211b699503c772aa1bc7d33b433c4242ac3',
  rewards: [
    '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
    '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    '0x96C4A48Abdf781e9c931cfA92EC0167Ba219ad8E',
    '0x912CE59144191C1204E64559FE8253a0e49E6548',
  ],
}

const locker: Contract = {
  chain: 'arbitrum',
  address: '0x70f61901658aAFB7aE57dA0C30695cE4417e72b9',
  token: '0xBfbCFe8873fE28Dfa25f1099282b088D52bbAD9C',
  rewards: ['0xd4848211B699503C772aA1Bc7D33b433C4242Ac3'],
}

const xEQB: Contract = {
  chain: 'arbitrum',
  address: '0x96c4a48abdf781e9c931cfa92ec0167ba219ad8e',
  underlyings: ['0xbfbcfe8873fe28dfa25f1099282b088d52bbad9c'],
}

const masterChef: Contract = {
  chain: 'arbitrum',
  address: '0x4d32c8ff2facc771ec7efc70d6a8468bc30c26bf',
}

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getEqPoolsContracts(ctx, masterChef)

  return {
    contracts: { pools, locker, ePendle, xEQB },
    revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getEqPoolBalances,
    locker: getEqLockerBalance,
    xEQB: getxEqbLockerBalances,
    ePendle: getSingleEqBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1686182400,
                  }
                  