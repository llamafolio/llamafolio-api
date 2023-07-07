import { getBalancerPoolsBalances } from '@adapters/balancer/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  extraEarned: {
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
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  reductionPerCliff: {
    inputs: [],
    name: 'reductionPerCliff',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  EMISSIONS_MAX_SUPPLY: {
    inputs: [],
    name: 'EMISSIONS_MAX_SUPPLY',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalSupply: {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  totalCliffs: {
    inputs: [],
    name: 'totalCliffs',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  mintRate: {
    inputs: [],
    name: 'mintRate',
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
} as const

const BAL: Token = {
  chain: 'ethereum',
  address: '0xba100000625a3754423978a60c9317c58a424e3D',
  decimals: 18,
  symbol: 'BAL',
}

const auraBal: Token = {
  chain: 'ethereum',
  address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d',
  decimals: 18,
  symbol: 'auraBAL',
}

const Aura: { [key: string]: Contract } = {
  ethereum: {
    chain: 'ethereum',
    address: '0xc0c293ce456ff0ed870add98a0828dd4d2903dbf',
    decimals: 18,
    symbol: 'AURA',
  },
  arbitrum: {
    chain: 'ethereum',
    address: '0x1509706a6c66CA549ff0cB464de88231DDBe213B',
    decimals: 18,
    symbol: 'AURA',
    l2Coordinator: '0xec1c780a275438916e7ceb174d80878f29580606',
  },
}

export async function getAuraBalStakerBalances(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [balanceOfRes, earnedRes] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...auraBal,
    amount: balanceOfRes,
    rewards: [{ ...BAL, amount: earnedRes }],
    category: 'farm',
  }
}

export async function getAuraPoolsBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[]> {
  const balanceWithStandardRewards: Balance[] = []
  const balanceWithExtraRewards: Balance[] = []
  const balances: Balance[] = await getBalancerPoolsBalances(ctx, pools, vault)

  const calls: Call<typeof abi.earned>[] = []
  for (const balance of balances) {
    calls.push({ target: (balance as Contract).gauge, params: [ctx.address] })
  }

  const earnedsRes = await multicall({ ctx, calls, abi: abi.earned })

  for (let idx = 0; idx < balances.length; idx++) {
    const balance = balances[idx]
    const rewards = balance.rewards
    const earnedRes = earnedsRes[idx]

    if (!rewards || !earnedRes.success) {
      continue
    }

    const poolBalance: Balance = {
      ...balance,
      rewards: [{ ...rewards[0], amount: earnedRes.output }, ...rewards.slice(1)],
      category: 'farm',
    }

    if (poolBalance.rewards && poolBalance.rewards.length > 1) {
      balanceWithExtraRewards.push(poolBalance)
    } else {
      balanceWithStandardRewards.push(poolBalance)
    }
  }

  const balanceWithExtraRewardsBalances = await getExtraRewardsBalances(ctx, balanceWithExtraRewards)

  if (ctx.chain !== 'ethereum') {
    return getAuraMintAmountOnArbitrum(
      ctx,
      [...balanceWithStandardRewards, ...balanceWithExtraRewardsBalances],
      Aura[ctx.chain],
    )
  }

  return getAuraMintAmount(ctx, [...balanceWithStandardRewards, ...balanceWithExtraRewardsBalances], Aura[ctx.chain])
}

export const getAuraMintAmount = async (
  ctx: BalancesContext,
  balances: Balance[],
  Aura: Contract,
): Promise<Balance[]> => {
  const balancesWithExtraRewards: Balance[] = []

  const [reductionPerCliff, maxSupply, totalSupply, totalCliffs] = await Promise.all([
    call({ ctx, target: Aura.address, abi: abi.reductionPerCliff }),
    call({ ctx, target: Aura.address, abi: abi.EMISSIONS_MAX_SUPPLY }),
    call({ ctx, target: Aura.address, abi: abi.totalSupply }),
    call({ ctx, target: Aura.address, abi: abi.totalCliffs }),
  ])

  const minterMinted = 0n

  // e.g. emissionsMinted = 6e25 - 5e25 - 0 = 1e25;
  const emissionsMinted = totalSupply - maxSupply - minterMinted

  // e.g. reductionPerCliff = 5e25 / 500 = 1e23
  // e.g. cliff = 1e25 / 1e23 = 100
  const cliff = emissionsMinted / reductionPerCliff

  // e.g. 100 < 500
  if (cliff < totalCliffs) {
    // e.g. (new) reduction = (500 - 100) * 2.5 + 700 = 1700;
    // e.g. (new) reduction = (500 - 250) * 2.5 + 700 = 1325;
    // e.g. (new) reduction = (500 - 400) * 2.5 + 700 = 950;

    const reduction = ((totalCliffs - cliff) * 5n) / 2n + 700n
    // e.g. (new) amount = 1e19 * 1700 / 500 =  34e18;
    // e.g. (new) amount = 1e19 * 1325 / 500 =  26.5e18;
    // e.g. (new) amount = 1e19 * 950 / 500  =  19e17;

    for (const balance of balances) {
      const reward = balance.rewards?.[0]

      if (!reward) {
        continue
      }

      let amount = (reward.amount * reduction) / totalCliffs

      // e.g. amtTillMax = 5e25 - 1e25 = 4e25
      const amtTillMax = maxSupply - emissionsMinted
      if (amount > amtTillMax) {
        amount = amtTillMax
      }

      balance.rewards?.push({ ...Aura, amount })

      balancesWithExtraRewards.push({ ...balance })
    }
  }

  return balancesWithExtraRewards
}

const getAuraMintAmountOnArbitrum = async (
  ctx: BalancesContext,
  balances: Balance[],
  Aura: Contract,
): Promise<Balance[]> => {
  const mintRate = await call({ ctx, target: Aura.l2Coordinator, abi: abi.mintRate })

  return balances.map((balance) => ({
    ...balance,
    rewards: [...balance.rewards!, { ...Aura, amount: (balance.rewards![0].amount * mintRate) / parseEther('1.0') }],
  }))
}

const getExtraRewardsBalances = async (ctx: BalancesContext, poolBalance: Balance[]): Promise<Balance[]> => {
  const extraRewardsBalancesRes = await multicall({
    ctx,
    calls: poolBalance.map((pool: Contract) => ({ target: pool.rewarder, params: [ctx.address] } as const)),
    abi: abi.extraEarned,
  })

  poolBalance.forEach((pool, idx) => {
    const extraRewardsBalances = extraRewardsBalancesRes[idx].success ? extraRewardsBalancesRes[idx].output : 0n
    pool.rewards = [pool.rewards![0], { ...pool.rewards![1], amount: extraRewardsBalances! }]
  })

  return poolBalance
}
