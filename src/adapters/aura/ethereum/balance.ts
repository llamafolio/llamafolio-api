import { getBalancerPoolsBalances } from '@adapters/balancer/common/balance'
import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
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
} as const

const BAL: Token = {
  chain: 'ethereum',
  address: '0xba100000625a3754423978a60c9317c58a424e3D',
  decimals: 18,
  symbol: 'BAL',
}

const AURA: Token = {
  chain: 'ethereum',
  address: '0xc0c293ce456ff0ed870add98a0828dd4d2903dbf',
  decimals: 18,
  symbol: 'AURA',
}

const auraBal: Token = {
  chain: 'ethereum',
  address: '0x616e8BfA43F920657B3497DBf40D6b1A02D4608d',
  decimals: 18,
  symbol: 'auraBAL',
}

const auraRewards: Contract = {
  chain: 'ethereum',
  address: '0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF',
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
  const balanceWithRewards: Balance[] = []
  const balances: Balance[] = await getBalancerPoolsBalances(ctx, pools, vault)

  const calls: Call<typeof abi.earned>[] = []
  for (const balance of balances) {
    calls.push({ target: (balance as Contract).gauge, params: [ctx.address] })
  }

  const earnedsRes = await multicall({ ctx, calls, abi: abi.earned })

  for (let idx = 0; idx < balances.length; idx++) {
    const balance = balances[idx]
    const earnedRes = earnedsRes[idx]

    if (!earnedRes.success) {
      continue
    }

    balanceWithRewards.push({
      ...balance,
      rewards: [{ ...BAL, amount: earnedRes.output }],
      category: 'farm',
    })
  }

  return getAuraMintAmount(ctx, balanceWithRewards, auraRewards)
}

/**
 *  Explanation: to getExtraAuraRewards
 *  https://docs.aura.finance/developers/how-to-___/see-reward-tokens-yield-on-aura-pools
 */

export const getAuraMintAmount = async (
  ctx: BalancesContext,
  balances: Balance[],
  auraRewards: Contract,
): Promise<Balance[]> => {
  const balancesWithExtraRewards: Balance[] = []

  const [reductionPerCliff, maxSupply, totalSupply, totalCliffs] = await Promise.all([
    call({ ctx, target: auraRewards.address, abi: abi.reductionPerCliff }),
    call({ ctx, target: auraRewards.address, abi: abi.EMISSIONS_MAX_SUPPLY }),
    call({ ctx, target: auraRewards.address, abi: abi.totalSupply }),
    call({ ctx, target: auraRewards.address, abi: abi.totalCliffs }),
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
