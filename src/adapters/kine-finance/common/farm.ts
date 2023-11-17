import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import { getPairsDetails } from '@lib/uniswap/v2/factory'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  stakingToken: {
    constant: true,
    inputs: [],
    name: 'stakingToken',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  accountStakes: {
    constant: true,
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'accountStakes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const KINE: { [key: string]: `0x${string}` } = {
  ethereum: '0xCbfef8fdd706cde6F208460f2Bf39Aa9c785F05D',
  bsc: '0xbFa9dF9ed8805E657D0FeaB5d186c6a567752D7F',
  polygon: '0xa9C1740fA56e4c0f6Ce5a792fd27095C8b6CCd87',
}

export async function getKineFarmingPools(ctx: BaseContext, farmAddresses: `0x${string}`[]): Promise<Contract[]> {
  const lpToken = await multicall({
    ctx,
    calls: farmAddresses.map((address) => ({ target: address }) as const),
    abi: abi.stakingToken,
  })

  const pools = mapSuccessFilter(lpToken, (res) => ({
    chain: ctx.chain,
    address: res.input.target,
    token: res.output,
    rewards: [KINE[ctx.chain]],
  }))

  return getPairsDetails(ctx, pools, { getAddress: (contract) => contract.token! })
}

export async function getKineFarmingBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const [userBalances, userPendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.accountStakes,
    }),
    multicall({
      ctx,
      calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
      abi: abi.earned,
    }),
  ])

  const poolBalances: Balance[] = mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userPendingRewards[i]]),

    (res, index) => {
      const pool = pools[index]
      const [{ output: balance }, { output: reward }] = res.inputOutputPairs

      return {
        ...pool,
        amount: balance,
        underlyings: pool.underlyings as Contract[],
        rewards: [{ ...(pool.rewards?.[0] as Contract), amount: reward }],
        category: 'farm',
      }
    },
  )

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
