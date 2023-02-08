import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { Call, multicall } from '@lib/multicall'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
}

export async function getAuraPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call[] = []
  const suppliesCalls: Call[] = []
  const poolTokensBalancesCalls: Call[] = []

  for (const pool of pools) {
    calls.push({ target: pool.crvRewards, params: [ctx.address] })
    suppliesCalls.push({ target: pool.address, params: [] })
    poolTokensBalancesCalls.push({ target: vault.address, params: [pool.poolId] })
  }

  const [balanceOfRes, suppliesRes, poolTokensBalancesRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: suppliesCalls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: poolTokensBalancesCalls, abi: erc20Abi.balanceOf }),
  ])
}
