import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'
import { getERC20Details } from '@lib/erc20'
import { BaseContext, Contract, Balance } from '@lib/adapter'
import { Chain } from '@defillama/sdk/build/general'
import { call } from '@defillama/sdk/build/abi'

interface BalanceWithExtraProps extends Balance {
  lockEnd: string
}

export async function getLockerBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  const balances: BalanceWithExtraProps[] = []

  if (!contract || !contract.underlyings?.[0]) {
    console.log('Missing or Incorrect locker contract')

    return []
  }

  try {
    const [balanceLockedRes, claimableRewardsRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
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
      }),

      multicall({
        chain,
        calls: [contract].map((c) => ({
          target: c.address,
          params: [ctx.address],
        })),
        abi: {
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
      }),
    ])

    const balanceLocked = balanceLockedRes.output[3].map((balance: any) => BigNumber.from(balance.amount))
    const formattedBalanceLocked: BigNumber = balanceLocked.reduce((previous: BigNumber, current: BigNumber) =>
      previous.add(current),
    )

    const lockTimeDuration = balanceLockedRes.output[3].map((balance: any) => balance.unlockTime)
    const lockEnd = lockTimeDuration.sort((previous: number, current: number) => current - previous)

    const claimableRewards = claimableRewardsRes
      .filter((res) => res.success)
      .map((res) => res.output)
      .flat()

    const claimableRewardsTokens = claimableRewards.map((token) => token.token)
    const tokens = await getERC20Details(chain, claimableRewardsTokens)

    const claimableRewardsBalances = claimableRewards.map((token) => BigNumber.from(token.amount))

    balances.push({
      chain,
      address: contract.underlyings?.[0].address,
      symbol: contract.underlyings?.[0].symbol,
      decimals: contract.underlyings?.[0].decimals,
      amount: formattedBalanceLocked,
      lockEnd: lockEnd[0],
      rewards: [
        { ...tokens[0], amount: claimableRewardsBalances[0] },
        { ...tokens[1], amount: claimableRewardsBalances[1] },
      ],
      category: 'lock',
    })

    return balances
  } catch (error) {
    console.log('Failed to get locker balance')

    return []
  }
}
