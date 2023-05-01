import { BalancesContext } from '@lib/adapter'
import { Balance, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

interface Token extends Contract {
  name: string
}

const abi = {
  getUserInfo: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      {
        internalType: 'contract IERC20Upgradeable',
        name: '_rewardToken',
        type: 'address',
      },
    ],
    name: 'getUserInfo',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  veJoeUserInfos: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfos',
    outputs: [
      { internalType: 'uint256', name: 'balance', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      {
        internalType: 'uint256',
        name: 'lastClaimTimestamp',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'speedUpEndTimestamp',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  rJoeUserInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfo',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [
      { internalType: 'address', name: '_user', type: 'address' },
      {
        internalType: 'contract IERC20Upgradeable',
        name: '_token',
        type: 'address',
      },
    ],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPendingVeJoe: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getPendingVeJoe',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingRJoe: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'pendingRJoe',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const pools = [
  '0x1a731b2299e22fbac282e7094eda41046343cb51', // sJOE contract
  '0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341', // veJOE contract
  '0x102D195C3eE8BF8A9A89d63FB3659432d3174d81', // rJOE contract
]

const USDC: Token = {
  name: 'USD Coin',
  chain: 'avalanche',
  decimals: 6,
  address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  symbol: 'USDC',
}

const veJOE: Token = {
  name: 'VeJoeToken',
  chain: 'avalanche',
  decimals: 18,
  address: '0x3cabf341943Bc8466245e4d6F1ae0f8D071a1456',
  symbol: 'veJOE',
}

const rJOE: Token = {
  name: 'RocketJoeToken',
  chain: 'avalanche',
  decimals: 18,
  address: '0x5483ce08659fABF0277f9314868Cc4f78687BD08',
  symbol: 'rJOE',
}

const JOE: Token = {
  name: 'TraderJoe Token',
  chain: 'avalanche',
  address: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
  symbol: 'JOE',
  decimals: 18,
  rewards: [USDC, veJOE, rJOE],
  coingeckoId: 'joe',
}

export async function getStakeBalance(ctx: BalancesContext) {
  const balances: Balance[] = []

  const [sJOEbalanceOfRes, veJOEbalanceOfRes, rJOEbalanceOfRes] = await Promise.all([
    call({
      ctx,
      target: pools[0],
      params: [ctx.address, USDC.address],
      abi: abi.getUserInfo,
    }),

    call({
      ctx,
      target: pools[1],
      params: [ctx.address],
      abi: abi.veJoeUserInfos,
    }),

    call({
      ctx,
      target: pools[2],
      params: [ctx.address],
      abi: abi.rJoeUserInfo,
    }),
  ])

  const sJOEbalanceOf = BigNumber.from(sJOEbalanceOfRes.output[0])
  const veJOEbalanceOf = BigNumber.from(veJOEbalanceOfRes.output.balance)
  const rJOEbalanceOf = BigNumber.from(rJOEbalanceOfRes.output.amount)

  const stakeAmount = [sJOEbalanceOf, veJOEbalanceOf, rJOEbalanceOf]

  const [sJOErewardsRes, veJOErewardsRes, rJOErewardsRes] = await Promise.all([
    call({
      ctx,
      target: pools[0],
      params: [ctx.address, USDC.address],
      abi: abi.pendingReward,
    }),

    call({
      ctx,
      target: pools[1],
      params: [ctx.address],
      abi: abi.getPendingVeJoe,
    }),

    call({
      ctx,
      target: pools[2],
      params: [ctx.address],
      abi: abi.pendingRJoe,
    }),
  ])

  const sJOErewards = BigNumber.from(sJOErewardsRes.output)
  const veJOErewards = BigNumber.from(veJOErewardsRes.output)
  const rJOErewards = BigNumber.from(rJOErewardsRes.output)

  const rewardsAmount = [sJOErewards, veJOErewards, rJOErewards]

  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i]
    const amount = stakeAmount[i]
    const rewardToken = JOE.rewards?.[i]
    const rewardBalance = rewardsAmount[i]

    const balance: Balance = {
      ...JOE,
      address: pool,
      amount,
      rewards: [{ ...(rewardToken as Balance), amount: rewardBalance }],
      category: 'stake',
    }
    balances.push(balance)
  }
  return balances
}