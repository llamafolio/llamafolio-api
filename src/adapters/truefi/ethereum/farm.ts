import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const TRU: Contract = {
  chain: 'ethereum',
  address: '0x4c19596f5aaff459fa38b0f7ed92f11ae6543784',
  name: 'TrueFi',
  symbol: 'TRU',
  decimals: 8,
}

const trueMultiFarm = '0xec6c3fd795d6e6f202825ddb56e01b3c128b0b10'

export async function getFarmBalances(ctx: BalancesContext, chain: Chain, pools: Contract[]) {
  const balances: Balance[] = []

  const calls = pools.map((pool) => ({
    target: trueMultiFarm,
    params: [pool.address, ctx.address],
  }))

  const [staked, claimable] = await Promise.all([
    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          {
            internalType: 'contract IERC20',
            name: 'token',
            type: 'address',
          },
          { internalType: 'address', name: 'staker', type: 'address' },
        ],
        name: 'staked',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        inputs: [
          {
            internalType: 'contract IERC20',
            name: 'token',
            type: 'address',
          },
          { internalType: 'address', name: 'account', type: 'address' },
        ],
        name: 'claimable',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]

    if (staked[i].success) {
      const amount = BigNumber.from(staked[i].output).mul(pool.poolValue).div(pool.totalSupply)

      const balance: Balance = {
        ...(pool as Balance),
        amount,
        underlyings: [{ ...(pool.underlyings?.[0] as Balance), amount }],
        category: 'farm',
      }

      if (claimable[i].success) {
        balance.rewards = [
          {
            ...TRU,
            amount: BigNumber.from(claimable[i].output),
            claimable: BigNumber.from(claimable[i].output),
          },
        ]
      }

      balances.push(balance)
    }
  }

  return balances
}
