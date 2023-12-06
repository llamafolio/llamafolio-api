import { getCowVestingBalance } from '@adapters/cow-swap/ethereum/vest'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const veCOW: Contract = {
  chain: 'ethereum',
  address: '0xd057b63f5e69cf1b929b356b579cba08d7688048',
  token: '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB',
}

const rewarder: Contract = {
  chain: 'ethereum',
  address: '0x68ffaac7a431f276fe73604c127bd78e49070c92',
}

export const getContracts = () => {
  return {
    contracts: { veCOW },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    veCOW: (...args) => getCowVestingBalance(...args, rewarder),
  })

  return {
    groups: [{ balances }],
  }
}
