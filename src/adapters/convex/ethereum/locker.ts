import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20Details } from '@lib/erc20'
import { sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

interface BalanceWithExtraProps extends Balance {
  lock: { end: number }
}

const abi = {
  lockedBalances: {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'lockedBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: 'total',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'unlockable',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'locked',
        type: 'uint256',
      },
      {
        components: [
          {
            internalType: 'uint112',
            name: 'amount',
            type: 'uint112',
          },
          {
            internalType: 'uint112',
            name: 'boosted',
            type: 'uint112',
          },
          {
            internalType: 'uint32',
            name: 'unlockTime',
            type: 'uint32',
          },
        ],
        internalType: 'struct CvxLockerV2.LockedBalance[]',
        name: 'lockData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  claimableRewards: {
    inputs: [
      {
        internalType: 'address',
        name: '_account',
        type: 'address',
      },
    ],
    name: 'claimableRewards',
    outputs: [
      {
        components: [
          {
            internalType: 'address',
            name: 'token',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'amount',
            type: 'uint256',
          },
        ],
        internalType: 'struct CvxLockerV2.EarnedData[]',
        name: 'userRewards',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getLockerBalances(ctx: BalancesContext, contract: Contract, CVX: Contract) {
  const balances: BalanceWithExtraProps[] = []

  const [getBalanceLocked, getClaimableRewards] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.lockedBalances,
    }),

    multicall({
      ctx,
      calls: [contract].map((c) => ({
        target: c.address,
        params: [ctx.address],
      })),
      abi: abi.claimableRewards,
    }),
  ])

  const balanceLocked = sumBN(
    getBalanceLocked.output[3].map((locked: { amount: string }) => BigNumber.from(locked.amount)),
  )

  const lockerDuration = getBalanceLocked.output[3].map((locked: { unlockTime: number }) => locked.unlockTime)
  const lastLockerTimer = lockerDuration.sort((previous: number, current: number) => current - previous)

  const claimableRewards = getClaimableRewards
    .filter((res) => res.success)
    .map((res) => res.output)
    .flat()

  const claimableRewardsBalances = claimableRewards.map((token) => BigNumber.from(token.amount))
  const claimableRewardsTokens = claimableRewards.map((claim) => claim.token)

  const tokens = await getERC20Details(ctx, claimableRewardsTokens)
  const rewards = tokens.map((token, i) => ({ ...token, amount: claimableRewardsBalances[i] }))

  balances.push({
    chain: ctx.chain,
    address: CVX.address,
    symbol: CVX.symbol,
    decimals: CVX.decimals,
    amount: balanceLocked,
    lock: lastLockerTimer[0],
    rewards,
    category: 'lock',
  })

  return balances
}
