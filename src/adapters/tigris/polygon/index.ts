import type { AdapterConfig } from "@lib/adapter";import { getTigrisStakeBalance } from '@adapters/tigris/common/stake'
import type { Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const staker: Contract = {
  chain: 'polygon',
  address: '0xc6c32ed781450228dfadfa49a430d7868b110f44',
  token: '0x7157Fe7533f2fc77498755Cc253d79046c746560',
  rewards: ['0x76973ba2aff24f87ffe41fdbfd15308debb8f7e8'],
}

export const getContracts = () => {
  return {
    contracts: { staker },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    staker: getTigrisStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1687132800,
                  }
                  