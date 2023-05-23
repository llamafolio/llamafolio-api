import { getOriginStakeBalance } from '@adapters/origin/ethereum/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'

const OGN_staker_v1: Contract = {
  chain: 'ethereum',
  address: '0xcce8e784c777fb9435f89f4e45f8b7fc49f7669f',
  token: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
}

const OGN_staker_v2: Contract = {
  chain: 'ethereum',
  address: '0x501804b374ef06fa9c427476147ac09f1551b9a0',
  token: '0x8207c1FfC5B6804F6024322CcF34F29c3541Ae26',
}

export const getContracts = async () => {
  return {
    contracts: { OGN_staker_v1, OGN_staker_v2 },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    OGN_staker_v1: getSingleStakeBalance,
    OGN_staker_v2: getOriginStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}
