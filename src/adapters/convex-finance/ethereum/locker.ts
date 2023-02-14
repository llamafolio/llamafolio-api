import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

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

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getLockerBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [lockedDatasRes, claimableRewardsRes] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.lockedBalances }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.claimableRewards }),
  ])

  const lockedDatas = lockedDatasRes.output
  const totalLocked = BigNumber.from(lockedDatas.total)

  const claimableRewards = claimableRewardsRes.output

  for (const lockedData of lockedDatas.lockData) {
    const balance: Balance = {
      ...contract,
      amount: BigNumber.from(lockedData.amount),
      lock: { end: lockedData.unlockTime },
      underlyings: [CVX],
      rewards: [],
      category: 'lock',
    }

    for (const claimableReward of claimableRewards) {
      const reward: Balance = {
        chain: ctx.chain,
        address: claimableReward.token,
        amount: BigNumber.from(claimableReward.amount).mul(balance.amount).div(totalLocked),
      }

      if (reward.amount.gt(0)) {
        balance.rewards?.push(reward)
      }
    }
    balances.push(balance)
  }
  return balances
}
