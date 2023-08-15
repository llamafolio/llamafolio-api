import { getCLYv1StakeBalances, getCLYv2StakeBalances } from '@adapters/colony/avalanche/balance'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const CLY_v1: Contract = {
  chain: 'avalanche',
  address: '0x5b0d74c78f2588b3c5c49857edb856cc731dc557',
  token: '0xec3492a2508ddf4fdc0cd76f31f340b30d1793e6',
}

const CLY_v2: Contract = {
  chain: 'avalanche',
  address: '0x7ccda6e26dced1ba275c67cd20235790ed615a8d',
  token: '0xec3492a2508ddf4fdc0cd76f31f340b30d1793e6',
  version: 2,
}

export const getContracts = () => {
  return {
    contracts: { CLY_v1, CLY_v2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    CLY_v1: getCLYv1StakeBalances,
    CLY_v2: getCLYv2StakeBalances,
  })

  return {
    groups: [{ balances }],
  }
}
