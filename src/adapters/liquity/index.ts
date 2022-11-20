import { getFarmBalance } from '@adapters/liquity/farm'
import { getLendBalances } from '@adapters/liquity/lend'
import { getStakeBalances } from '@adapters/liquity/stake'
import { Adapter, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const stabilityPool: Contract = {
  name: 'Stability Pool',
  displayName: 'Stability Pool',
  chain: 'ethereum',
  address: '0x66017D22b0f8556afDd19FC67041899Eb65a21bb',
}

const troveManager: Contract = {
  name: 'Trove',
  displayName: 'Trove Manager',
  chain: 'ethereum',
  address: '0xa39739ef8b0231dbfa0dcda07d7e29faabcf4bb2',
}

const lqtyStaking: Contract = {
  name: 'LQTY staking',
  chain: 'ethereum',
  address: '0x4f9Fbb3f1E99B56e0Fe2892e623Ed36A76Fc605d',
}

/**
 * Lending/borrowing interaction. Use trove manager to retrieve lending/borrowing balances
 */
const borrowerOperations: Contract = {
  name: 'Borrower Operations',
  chain: 'ethereum',
  address: '0x24179CD81c9e782A4096035f7eC97fB8B783e007',
}

/**
 * Lending/borrowing interaction through InstaDapp. Use trove manager to retrieve lending/borrowing balances
 */
const instaDappProxy: Contract = {
  name: 'Liquity-v1',
  chain: 'ethereum',
  address: '0x3643bA40B8e2bd8F77233BDB6abe38c218f31bFe',
}

const getContracts = () => {
  return {
    contracts: {
      stabilityPool,
      troveManager,
      lqtyStaking,
      borrowerOperations,
      instaDappProxy,
    },
    revalidate: 60 * 60,
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, {
    stabilityPool: getFarmBalance,
    troveManager: getLendBalances,
    lqtyStaking: getStakeBalances,
  })

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'liquity',
  getContracts,
  getBalances,
}

export default adapter
