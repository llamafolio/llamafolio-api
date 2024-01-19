import { getExtraRewardsBalances } from '@adapters/aura/common/extraReward'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { getUnderlyingsBalancesFromBalancer, type IBalancerBalance } from '@lib/balancer/underlying'
import { call } from '@lib/call'
import { abi as erc20Abi, getBalancesOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  earned: {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  balanceOfUnderlying: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'balanceOfUnderlying',
    outputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type AuraBalance = Balance & {
  rewarders: `0x${string}`[]
}
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

const AURA: Contract = {
  chain: 'ethereum',
  address: '0xc0c293ce456ff0ed870add98a0828dd4d2903dbf',
  decimals: 18,
  symbol: 'AURA',
}

export async function getAuraBalStakerBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
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

export async function getAuraYieldBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userUnderlyingBalance, earned] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.balanceOfUnderlying }),
    call({ ctx, target: staker.rewarder, params: [ctx.address], abi: abi.earned }),
  ])

  return {
    ...staker,
    amount: userBalance,
    underlyings: [{ ...(staker.underlyings?.[0] as Contract), amount: userUnderlyingBalance }],
    rewards: [{ ...(staker.rewards?.[0] as Contract), amount: earned }],
    category: 'farm',
  }
}

export async function getAuraFarmBalances(
  ctx: BalancesContext,
  pools: Contract[],
  vault: Contract,
): Promise<Balance[]> {
  const balances = (await getBalancesOf(ctx, pools, { getAddress: (contract) => contract.gauge })).map((balance) => ({
    ...balance,
    category: 'farm',
  }))

  const poolBalances = await getUnderlyingsBalancesFromBalancer(ctx, balances as IBalancerBalance[], vault, {
    getAddress: (balance: Balance) => balance.address,
    getCategory: (balance: Balance) => balance.category,
  })

  const earnedsRes = await multicall({
    ctx,
    calls: poolBalances.map((balance: Contract) => ({ target: balance.gauge, params: [ctx.address] }) as const),
    abi: abi.earned,
  })

  const fmtBalances = mapSuccessFilter(earnedsRes, (res, idx) => {
    const poolBalance = poolBalances[idx]
    const rewards = poolBalance.rewards as Contract[]

    return { ...poolBalance, rewards: [{ ...rewards![0], amount: res.output }, ...rewards!.slice(1)] }
  }) as Balance[]

  return getAuraMintAmount(ctx, await getExtraRewardsBalances(ctx, fmtBalances as AuraBalance[]))
}

export const getAuraMintAmount = async (ctx: BalancesContext, balances: Balance[]): Promise<Balance[]> => {
  const balancesWithExtraRewards: Balance[] = []

  const [reductionPerCliff, maxSupply, totalSupply, totalCliffs] = await Promise.all([
    call({ ctx, target: AURA.address, abi: abi.reductionPerCliff }),
    call({ ctx, target: AURA.address, abi: abi.EMISSIONS_MAX_SUPPLY }),
    call({ ctx, target: AURA.address, abi: abi.totalSupply }),
    call({ ctx, target: AURA.address, abi: abi.totalCliffs }),
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

      balance.rewards?.push({ ...AURA, amount })

      balancesWithExtraRewards.push({ ...balance })
    }
  }

  return balancesWithExtraRewards
}
