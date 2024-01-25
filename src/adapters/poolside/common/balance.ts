import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  tokenOfOwnerByIndex: {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'index',
        type: 'uint256',
      },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  uint256ToAddress: {
    inputs: [
      {
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'uint256ToAddress',
    outputs: [
      {
        internalType: 'address',
        name: 'vault',
        type: 'address',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  getCurrentStakeReward: {
    inputs: [
      {
        internalType: 'address',
        name: 'vault',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'stakeAmount',
        type: 'uint256',
      },
    ],
    name: 'getCurrentStakeReward',
    outputs: [
      {
        internalType: 'uint256',
        name: 'reward',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getVaultData: {
    inputs: [
      {
        internalType: 'address',
        name: 'vault',
        type: 'address',
      },
    ],
    name: 'getVaultData',
    outputs: [
      {
        components: [
          {
            internalType: 'uint256',
            name: 'totalStake',
            type: 'uint256',
          },
          {
            components: [
              {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
              },
              {
                internalType: 'uint256',
                name: 'timestamp',
                type: 'uint256',
              },
            ],
            internalType: 'struct IGeyser.StakeData[]',
            name: 'stakes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct IGeyser.VaultData',
        name: 'vaultData',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getPoolSideBalances(
  ctx: BalancesContext,
  pool: Contract,
  controller: Contract,
): Promise<Balance[]> {
  const userNftLength = await call({ ctx, target: pool.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const userNftIds = await multicall({
    ctx,
    calls: rangeBI(0n, userNftLength).map((i) => ({ target: pool.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const nftIdToVaultAddresses = await multicall({
    ctx,
    calls: mapSuccessFilter(userNftIds, (res) => ({ target: res.input.target, params: [res.output] }) as const),
    abi: abi.uint256ToAddress,
  })

  const vaultAddressesAmount = await multicall({
    ctx,
    calls: mapSuccessFilter(
      nftIdToVaultAddresses,
      (res) => ({ target: controller.address, params: [res.output] }) as const,
    ),
    abi: abi.getVaultData,
  })

  const vaultRewardsAmount = await multicall({
    ctx,
    calls: mapSuccessFilter(
      vaultAddressesAmount,
      (res) =>
        ({
          target: controller.address,
          params: [res.input.params[0], res.output.totalStake],
        }) as const,
    ),
    abi: abi.getCurrentStakeReward,
  })

  const poolBalances: Balance[] = mapSuccessFilter(vaultRewardsAmount, (res) => {
    const underlyings = pool.underlyings as Contract[]
    const reward = pool.rewards![0] as Contract
    const amount = res.input.params[1]
    const rewardAmount = res.output

    return {
      ...pool,
      amount,
      underlyings,
      rewards: [{ ...reward, amount: rewardAmount }],
      category: 'farm',
    }
  })

  return getUnderlyingBalances(ctx, poolBalances, { getAddress: (contract) => contract.token! })
}
