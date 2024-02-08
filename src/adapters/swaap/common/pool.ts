import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getSwaapPools(
  ctx: BaseContext,
  poolAddresses: `0x${string}`[],
  vault: Contract,
): Promise<Contract[]> {
  const poolIds = await multicall({
    ctx,
    calls: poolAddresses.map((address) => ({ target: address }) as const),
    abi: abi.getPoolId,
  })

  const getTokenByPoolIds = await multicall({
    ctx,
    calls: mapSuccessFilter(poolIds, (res) => ({ target: vault.address, params: [res.output] }) as const),
    abi: abi.getPoolTokens,
  })

  return mapMultiSuccessFilter(
    poolIds.map((_, i) => [poolIds[i], getTokenByPoolIds[i]]),

    (res) => {
      const [{ input, output: poolId }, { output: poolParams }] = res.inputOutputPairs

      return {
        chain: ctx.chain,
        address: input.target,
        poolId,
        underlyings: poolParams[0],
      }
    },
  )
}

export async function getSwaapBalances(ctx: BalancesContext, pools: Contract[], vault: Contract) {
  const lpBalances: Balance[] = (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.address })).map(
    (poolBalance) => ({
      ...poolBalance,
      category: 'lp',
    }),
  )

  return getUnderlyingsBalancesFromBalancer(ctx, lpBalances as IBalancerBalance[], vault, {
    getAddress: (balance: Balance) => balance.address,
    getCategory: (balance: Balance) => balance.category,
  })
}
