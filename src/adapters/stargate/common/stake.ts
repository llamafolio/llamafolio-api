import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  poolLength: {
    inputs: [],
    name: 'poolLength',
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
  stargate: {
    inputs: [],
    name: 'stargate',
    outputs: [
      {
        internalType: 'contract StargateToken',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

interface IStakeOptions {
  rewardToken: Token
  pendingRewardAbi: object
}

export async function getStakeBalances(ctx: BalancesContext, chain: Chain, lpStaking: Contract, options?: IStakeOptions) {
  const balances: Balance[] = []

  const poolCountRes = await call({
    abi: abi.poolLength,
    chain,
    target: lpStaking.address,
  })
  const poolCount = parseInt(poolCountRes.output)

  let calls = []
  for (let d = 0; d < poolCount; d++) {
    calls.push({
      params: [d],
      target: lpStaking.address,
    })
  }

  const poolInfoRes = await multicall({
    chain,
    calls: calls,
    abi: {
      inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      name: 'poolInfo',
      outputs: [
        { internalType: 'contract IERC20', name: 'lpToken', type: 'address' },
        { internalType: 'uint256', name: 'allocPoint', type: 'uint256' },
        { internalType: 'uint256', name: 'lastRewardBlock', type: 'uint256' },
        { internalType: 'uint256', name: 'accStargatePerShare', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const poolInfo = poolInfoRes.filter((res) => res.success).map((res) => res.output)

  //find matching tokens
  calls = []
  for (let d = 0; d < poolInfo.length; d++) {
    calls.push({
      params: [],
      target: poolInfo[d].lpToken,
    })
  }
  const tokenDetailsRes = await multicall({
    chain: chain,
    calls: calls,
    abi: {
      inputs: [],
      name: 'token',
      outputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const tokenDetails = tokenDetailsRes.filter((res) => res.success).map((res) => res.output)

  const tokenDetailsImproved = await getERC20Details(chain, tokenDetails)
  calls = []
  for (let d = 0; d < poolInfo.length; d++) {
    calls.push({
      params: [d, ctx.address],
      target: lpStaking.address,
    })
  }
  const balancesDRes = await multicall({
    chain: chain,
    calls: calls,
    abi: {
      inputs: [
        { internalType: 'uint256', name: '', type: 'uint256' },
        { internalType: 'address', name: '', type: 'address' },
      ],
      name: 'userInfo',
      outputs: [
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
        { internalType: 'uint256', name: 'rewardDebt', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })
  const balancesD = balancesDRes.filter((res) => res.success).map((res) => res.output)

  for (let c = 0; c < balancesD.length; c++) {
    const balance = balancesD[c]
    if (balance.amount > 0) {
      balances.push({
        chain,
        category: 'stake',
        symbol: tokenDetailsImproved[c].symbol,
        decimals: tokenDetailsImproved[c].decimals,
        address: poolInfo[c].lpToken,
        amount: BigNumber.from(balance.amount),
        // @ts-ignore
        priceSubstitute: tokenDetailsImproved[c].address,
        yieldKey: poolInfo[c].lpToken,
      })
    }
  }

  // Rewards
  let rewardToken = options?.rewardToken

  // Get reward token
  if (!rewardToken) {
    const stargateAddressRes = await call({
      chain,
      target: lpStaking.address,
      abi: abi.stargate,
    })

    rewardToken = {
      chain,
      address: stargateAddressRes.output,
      decimals: 18,
      symbol: 'STG',
    }
  }

  calls = []
  for (let d = 0; d < poolInfo.length; d++) {
    calls.push({
      params: [d, ctx.address],
      target: lpStaking.address,
    })
  }

  const pendingRewardAbi = options?.pendingRewardAbi || {
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'pendingStargate',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  }

  const pendingSTGRes = await multicall({
    chain,
    calls,
    abi: pendingRewardAbi,
  })

  for (let i = 0; i < pendingSTGRes.length; i++) {
    if (pendingSTGRes[i].success) {
      const pendingSTGs = BigNumber.from(pendingSTGRes[i].output || 0)
      if (pendingSTGs.gt(0)) {
        const parent = balances.find(
          (bal) => bal.category === 'stake' && bal.chain === chain && bal.address === poolInfo[i].lpToken,
        )
        if (!parent) {
          continue
        }

        if (!parent.rewards) {
          parent.rewards = []
        }
        parent.rewards.push({
          ...rewardToken,
          category: 'stake',
          amount: BigNumber.from(pendingSTGs),
          type: 'reward',
        })
      }
    }
  }

  return balances
}
