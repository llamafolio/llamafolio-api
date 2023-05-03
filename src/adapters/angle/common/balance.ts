import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { BN_TEN, isZero } from '@lib/math'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'
import { BigNumber } from 'ethers'

const abi = {
  claimable_reward: {
    stateMutability: 'view',
    type: 'function',
    name: 'claimable_reward',
    inputs: [
      { name: '_user', type: 'address' },
      { name: '_reward_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    gas: 26704,
  },
  getUnderlyingBalances: {
    inputs: [],
    name: 'getUnderlyingBalances',
    outputs: [
      {
        internalType: 'uint256',
        name: 'amount0Current',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount1Current',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const API_URL = 'https://api.angle.money/v1/pools'

export async function getStablePoolBalancesFromAPI(
  ctx: BalancesContext,
  pools: Contract[],
  chainId: number,
): Promise<Balance[]> {
  const poolsBalances: Balance[] = []

  const poolsByAddress: { [key: string]: Contract } = {}
  for (const pool of pools) {
    poolsByAddress[pool.address.toLowerCase()] = pool
  }

  const response = await fetch(`${API_URL}?chainId=${chainId}&user=${ctx.address}`)
  const datas = await response.json()

  const balances = Object.values(datas)
    .filter((data: any) => data && data.capitalGains && !isZero(data.capitalGains.lastStakedPosition))
    .map((data: any) => ({ address: data.sanTokenAddress.toLowerCase(), amount: data.capitalGains.lastStakedPosition }))

  for (const balance of balances) {
    const position = poolsByAddress[balance.address]
    if (!position?.decimals) {
      continue
    }

    const amount = BigNumber.from(parseInt(balance.amount)).mul(BN_TEN.pow(position.decimals))
    position.amount = amount

    const [underlying] = position.underlyings || []

    poolsBalances.push({
      ...position,
      amount,
      underlyings: underlying ? [{ ...(underlying as Contract), amount }] : undefined,
      rewards: position.rewards as Balance[],
      category: 'farm',
    })
  }

  return getAnglePoolsRewards(ctx, poolsBalances)
}

const getAnglePoolsRewards = async (ctx: BalancesContext, pools: Balance[]): Promise<Balance[]> => {
  const balances: Balance[] = []

  const calls: Call[] = []
  for (const pool of pools) {
    const reward = pool.rewards?.[0] as Contract

    if (!reward) {
      continue
    }

    calls.push({
      target: (pool as Contract).gauge,
      params: [ctx.address, '0x31429d1856aD1377A8A0079410B297e1a9e214c2'],
    })
  }

  const claimablesOfsRes = await multicall({ ctx, calls, abi: abi.claimable_reward })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const reward = pool.rewards?.[0]
    const claimableOfRes = claimablesOfsRes[poolIdx]

    if (!isSuccess(claimableOfRes)) {
      continue
    }

    // @ts-ignore
    balances.push({ ...pool, rewards: [{ ...reward, amount: BigNumber.from(claimableOfRes.output) }] })
  }

  return balances
}

export async function getAnglePoolsBalances(ctx: BalancesContext, pools: Contract[]): Promise<Balance[]> {
  const swapBalances: Balance[] = []
  const gelatoBalances: Balance[] = []

  const calls: Call[] = pools.map((pool) => ({ target: pool.address, params: [ctx.address] }))
  const rewardsCalls: Call[] = pools.map((pool) => ({
    target: pool.address,
    params: [ctx.address, '0x31429d1856aD1377A8A0079410B297e1a9e214c2'],
  }))

  const [balancesOfsRes, claimablesOfsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls: rewardsCalls, abi: abi.claimable_reward }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const pool = pools[poolIdx]
    const reward = pool.rewards?.[0] as Balance
    const balancesOfRes = balancesOfsRes[poolIdx]
    const claimablesOfRes = claimablesOfsRes[poolIdx]

    if (!isSuccess(balancesOfRes) || !isSuccess(claimablesOfRes)) {
      continue
    }

    if (pool.gaugeType === 'swap') {
      swapBalances.push({
        ...pool,
        address: pool.lpToken,
        amount: BigNumber.from(balancesOfRes.output),
        underlyings: pool.underlyings as Contract[],
        rewards: [{ ...reward, amount: BigNumber.from(claimablesOfRes.output) }],
        category: 'farm',
      })
    } else {
      gelatoBalances.push({
        ...pool,
        address: pool.lpToken,
        amount: BigNumber.from(balancesOfRes.output),
        underlyings: pool.underlyings as Contract[],
        rewards: [{ ...reward, amount: BigNumber.from(claimablesOfRes.output) }],
        category: 'farm',
      })
    }
  }

  const swapBalancesWithUnderlyings = await getUnderlyingBalances(ctx, swapBalances)

  const gelatoCalls: Call[] = []
  const suppliesCall: Call[] = []

  for (const gelatoBalance of gelatoBalances) {
    gelatoCalls.push({ target: gelatoBalance.address })
    suppliesCall.push({ target: gelatoBalance.address })
  }

  const [underlyingBalancesRes, suppliesRes] = await Promise.all([
    multicall({ ctx, calls: gelatoCalls, abi: abi.getUnderlyingBalances }),
    multicall({ ctx, calls: gelatoCalls, abi: erc20Abi.totalSupply }),
  ])

  for (let poolIdx = 0; poolIdx < gelatoBalances.length; poolIdx++) {
    const gelatoBalance = gelatoBalances[poolIdx]
    const { underlyings, amount } = gelatoBalance
    const underlyingBalanceRes = underlyingBalancesRes[poolIdx]
    const supplyRes = suppliesRes[poolIdx]

    if (!underlyings || !isSuccess(underlyingBalanceRes) || !isSuccess(supplyRes) || isZero(supplyRes.output)) {
      continue
    }

    ;(underlyings[0] as Balance).amount = amount.mul(underlyingBalanceRes.output.amount0Current).div(supplyRes.output)
    ;(underlyings[1] as Balance).amount = amount.mul(underlyingBalanceRes.output.amount1Current).div(supplyRes.output)
  }

  return [...swapBalancesWithUnderlyings, ...gelatoBalances]
}
