import { Balance, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'

export async function getPoolsContracts(chain: Chain, contract: Contract): Promise<Contract[]> {
  const contracts: Contract[] = []

  const getPoolCount = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'pool_count',
      inputs: [],
      outputs: [{ name: '', type: 'uint256' }],
      gas: 3558,
    },
  })

  const getPoolsLists = await multicall({
    chain,
    calls: range(0, getPoolCount.output).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      stateMutability: 'view',
      type: 'function',
      name: 'pool_list',
      inputs: [{ name: 'arg0', type: 'uint256' }],
      outputs: [{ name: '', type: 'address' }],
      gas: 3573,
    },
  })

  const poolsLists = getPoolsLists.filter((res) => res.success).map((res) => res.output)

  return poolsLists
}

export async function getPoolsBalances(ctx: BaseContext, chain: Chain, contract: string[]) {
  const balances: Balance[] = []

  const test = await getERC20Details(chain, contract)

  const TEST = await getERC20BalanceOf(ctx, chain, test)
  const nonZero = TEST.filter((balance) => balance.amount.gt(0))

  console.log(nonZero)
}
