import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { BN_TEN, isZero } from '@lib/math'
import { Call, multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'
import fetch from 'node-fetch'

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
}

const API_URL = 'https://api.angle.money/v1/pools'

export async function getPoolBalancesFromAPI(
  ctx: BalancesContext,
  pools: Contract[],
  chainId: string,
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
