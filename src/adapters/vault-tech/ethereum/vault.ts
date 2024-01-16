import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'

const abi = {
  Token: {
    inputs: [],
    name: 'Token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  amountStaked: {
    inputs: [{ internalType: 'address', name: 'holder', type: 'address' }],
    name: 'amountStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRewards: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'pendingRewards',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getVaultTechContracts(ctx: BaseContext, vaultAddresses: `0x${string}`[]): Promise<Contract[]> {
  const lpTokens = await multicall({
    ctx,
    calls: vaultAddresses.map((vault) => ({ target: vault }) as const),
    abi: abi.Token,
  })

  return mapSuccessFilter(lpTokens, (res, index) => ({
    chain: ctx.chain,
    address: vaultAddresses[index],
    token: res.output,
    rewards: [res.output],
  }))
}

export async function getVaultTechBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const [userBalances, userRewards] = await Promise.all([
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: abi.amountStaked,
    }),
    multicall({
      ctx,
      calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] }) as const),
      abi: abi.pendingRewards,
    }),
  ])

  return mapMultiSuccessFilter(
    userBalances.map((_, i) => [userBalances[i], userRewards[i]]),

    (res, index) => {
      const vault = vaults[index]
      const reward = vault.rewards![0] as Contract
      const [{ output: amount }, { output: rewardBalance }] = res.inputOutputPairs

      return {
        ...vault,
        amount,
        underlyings: undefined,
        rewards: [{ ...reward, amount: rewardBalance }],
        category: 'stake',
      }
    },
  )
}
