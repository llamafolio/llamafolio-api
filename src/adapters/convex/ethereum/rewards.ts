import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { getPoolFromLpTokenAddress, getPoolsUnderlyings, getUnderlyingsBalancesInPool } from '@lib/convex/underlyings'
import { getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

const abi = {
  earned: {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'earned',
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

  extraRewardsLength: {
    inputs: [],
    name: 'extraRewardsLength',
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

  extraRewards: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'extraRewards',
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

  rewardToken: {
    inputs: [],
    name: 'rewardToken',
    outputs: [
      {
        internalType: 'contract IERC20',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },

  totalSupply: {
    inputs: [],
    name: 'totalSupply',
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
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  symbol: 'CRV',
  decimals: 18,
}

const CVX: Token = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getCRVCVXRewards(ctx: BalancesContext, pool: Contract) {
  const rewards: Balance[] = []

  const [getCRVRewardsEarned, getExtraRewardsEarned] = await Promise.all([
    call({
      chain: ctx.chain,
      target: pool.address,
      params: [ctx.address],
      abi: abi.earned,
    }),

    call({
      chain: ctx.chain,
      target: pool.address,
      params: [],
      abi: abi.extraRewardsLength,
    }),
  ])

  const rewardsCRVEarned = BigNumber.from(getCRVRewardsEarned.output)
  const extraRewardsEarned = BigNumber.from(getExtraRewardsEarned.output)

  if (rewardsCRVEarned.gt(0)) {
    const CVXRewards = await getCVXRatio(ctx, CVX, rewardsCRVEarned)
    rewards.push({ ...CRV, amount: rewardsCRVEarned }, { ...CVX, amount: CVXRewards as BigNumber })
  }

  if (extraRewardsEarned.gt(0)) {
    const getExtraRewardsAddresses = await multicall({
      chain: ctx.chain,
      calls: range(0, +extraRewardsEarned).map((i) => ({
        target: pool.address,
        params: [i],
      })),
      abi: abi.extraRewards,
    })

    const extraRewardsAddresses = getExtraRewardsAddresses.filter((res) => res.success).map((res) => res.output)

    const [getEarnedExtraRewards, getExtraRewardsTokens] = await Promise.all([
      multicall({
        chain: ctx.chain,
        calls: extraRewardsAddresses.map((extra) => ({
          target: extra,
          params: [ctx.address],
        })),
        abi: abi.earned,
      }),

      multicall({
        chain: ctx.chain,
        calls: extraRewardsAddresses.map((extra) => ({
          target: extra,
          params: [],
        })),
        abi: abi.rewardToken,
      }),
    ])

    const earnedExtraRewards = getEarnedExtraRewards
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output))

    const extraRewardsTokens = getExtraRewardsTokens.filter((res) => res.success).map((res) => res.output)
    const rewardsTokens: Contract[] = await getERC20Details(ctx, extraRewardsTokens)

    for (const rewardsToken of rewardsTokens) {
      if (rewardsToken.name && rewardsToken.name.includes('Curve')) {
        rewardsToken.amount = earnedExtraRewards[0]
        rewardsToken.poolAddress = await getPoolFromLpTokenAddress(ctx, [rewardsToken.address])
        rewardsToken.underlyings = (await getPoolsUnderlyings(ctx, rewardsToken.poolAddress)).flat()

        const underlyingsBalances = await getUnderlyingsBalancesInPool(
          ctx.chain,
          rewardsToken,
          rewardsToken.address,
          rewardsToken.poolAddress[0],
        )

        rewards.push(...underlyingsBalances)
      } else {
        const basicRewards: Balance = {
          ...(rewardsToken as Balance),
          amount: earnedExtraRewards[0],
        }

        rewards.push(basicRewards)
      }
    }
  }

  return rewards
}

const getCVXRatio = async (ctx: BalancesContext, contract: Contract, earnedBalances: BigNumber) => {
  const totalSupplyRes = await call({
    chain: ctx.chain,
    target: contract.address,
    params: [],
    abi: abi.totalSupply,
  })

  const cvxTotalSupply = BigNumber.from(totalSupplyRes.output)

  const CLIFFSIZE = BigNumber.from(1e5).mul(utils.parseEther('1.0'))
  const MAXSUPPLY = BigNumber.from(1e8).mul(utils.parseEther('1.0'))
  const CLIFFCOUNT = BigNumber.from(1e3)

  const currentCliff = cvxTotalSupply.div(CLIFFSIZE)

  if (currentCliff.lt(MAXSUPPLY)) {
    const remainingCliff = CLIFFCOUNT.sub(currentCliff)

    return earnedBalances.mul(remainingCliff).div(CLIFFCOUNT)
  }
  return BigNumber.from(0)
}
