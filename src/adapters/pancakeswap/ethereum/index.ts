import type { Balance, BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { call } from '@lib/call'
import type { Address } from 'viem'
import { getAddress } from 'viem'

const cakeToken: Contract = {
  chain: 'ethereum',
  address: '0x152649eA73beAb28c5b49B26eb48f7EAD6d4c898',
  category: 'wallet',
  symbol: 'CAKE',
  decimals: 18,
}

export const getContracts = async (context: BaseContext, props: any) => {
  // ...
  return {
    contracts: {
      cake: cakeToken,
    },
    revalidate: 60,
  }
}

async function retrieveABI<T extends string>(options: { contract: Address; function?: T }) {
  const { contract, function: fn } = options
  //@ts-expect-error
  const abi = await client.query(
    fn
      ? /*sql*/ `SELECT abi FROM abi WHERE contract = $1 AND function = $2`
      : /*sql*/ `SELECT abi FROM abi WHERE contract = $1`,
    [contract, fn],
  )

  return { contract, abi }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (context, contracts, props) => {
  const abi = retrieveABI({ contract: '0x00', function: 'balanceOf' })
  const resolveCakeBalance = async (context: BalancesContext, contract: typeof cakeToken) => {
    const balanceCall = await call({
      ctx: context,
      target: getAddress(contract.address),
      abi: [],
      params: [context.address],
    })
    return { ...contract, amount: balanceCall } as Balance
  }

  const balances = await resolveBalances<typeof getContracts>(context, contracts, {
    cake: resolveCakeBalance,
  })
  return {
    groups: [{ balances }],
  }
}
