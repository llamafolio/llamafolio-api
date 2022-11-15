import { call } from '@defillama/sdk/build/abi'
import { BaseContext } from '@lib/adapter'
import { Balance, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'
interface Token extends Contract {
  name: string
}

const pools = [
  '0x1a731b2299e22fbac282e7094eda41046343cb51', // sJOE contract
  '0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341', // veJOE contract
  '0x102D195C3eE8BF8A9A89d63FB3659432d3174d81', // rJOE contract
]

const USDC: Token = {
  name: 'USD Coin',
  chain: 'avax',
  decimals: 6,
  address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
  symbol: 'USDC',
}

const veJOE: Token = {
  name: 'VeJoeToken',
  chain: 'avax',
  decimals: 18,
  address: '0x3cabf341943Bc8466245e4d6F1ae0f8D071a1456',
  symbol: 'veJOE',
}

const rJOE: Token = {
  name: 'RocketJoeToken',
  chain: 'avax',
  decimals: 18,
  address: '0x5483ce08659fABF0277f9314868Cc4f78687BD08',
  symbol: 'rJOE',
}

const JOE: Token = {
  name: 'TraderJoe Token',
  chain: 'avax',
  address: '0x6e84a6216ea6dacc71ee8e6b0a5b7322eebc0fdd',
  symbol: 'JOE',
  decimals: 18,
  rewards: [USDC, veJOE, rJOE],
  coingeckoId: 'joe',
}

export async function getStakeBalance(ctx: BaseContext, chain: Chain) {
  const balances: Balance[] = []

  const [sJOEbalanceOfRes, veJOEbalanceOfRes, rJOEbalanceOfRes] = await Promise.all([
    call({
      chain,
      target: pools[0],
      params: [ctx.address, USDC.address],
      abi: {
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
    }),

    call({
      chain,
      target: pools[1],
      params: [ctx.address],
      abi: {
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
    }),

    call({
      chain,
      target: pools[2],
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '', type: 'address' }],
        name: 'userInfo',
        outputs: [
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
          { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const sJOEbalanceOf = BigNumber.from(sJOEbalanceOfRes.output[0])
  const veJOEbalanceOf = BigNumber.from(veJOEbalanceOfRes.output.balance)
  const rJOEbalanceOf = BigNumber.from(rJOEbalanceOfRes.output.amount)

  const stakeAmount = [sJOEbalanceOf, veJOEbalanceOf, rJOEbalanceOf]

  const [sJOErewardsRes, veJOErewardsRes, rJOErewardsRes] = await Promise.all([
    call({
      chain,
      target: pools[0],
      params: [ctx.address, USDC.address],
      abi: {
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
    }),

    call({
      chain,
      target: pools[1],
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
        name: 'getPendingVeJoe',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),

    call({
      chain,
      target: pools[2],
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
        name: 'pendingRJoe',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    }),
  ])

  const sJOErewards = BigNumber.from(sJOErewardsRes.output)
  const veJOErewards = BigNumber.from(veJOErewardsRes.output)
  const rJOErewards = BigNumber.from(rJOErewardsRes.output)

  const rewardsAmount = [sJOErewards, veJOErewards, rJOErewards]

  for (let i = 0; i < pools.length; i++) {
    const balance: Balance = {
      ...JOE,
      address: pools[i],
      amount: stakeAmount[i],
      rewards: [{ ...JOE.rewards?.[i], amount: rewardsAmount[i] }],
      category: 'stake',
    }
    balances.push(balance)
  }
  return balances
}
