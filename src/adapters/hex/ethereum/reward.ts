import type { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'

interface stakeAndIndexParams {
  stakeId: number
  stake: bigint
  share: bigint
  stakedDays: number
  lockedDays: number
}

interface decodedDataParams {
  payout: bigint
  shares: bigint
  sats: bigint
}

export async function getRewardsBalances(
  ctx: BaseContext,
  contract: Contract,
  stakesAndIndexes: stakeAndIndexParams[],
) {
  const rewards: bigint[] = []

  for (const stakeAndIndex of stakesAndIndexes) {
    const reward = await getInterestForRangeDays(ctx, contract, stakeAndIndex)

    rewards.push(reward)
  }
  return rewards
}

const HEX_DECODER = (encodedDailyData: string) => {
  const HEARTS_UINT_SHIFT = BigInt(72)
  const HEARTS_MASK = (BigInt(1) << HEARTS_UINT_SHIFT) - BigInt(1)
  const SATS_UINT_SHIFT = BigInt(56)
  const SATS_MASK = (BigInt(1) << SATS_UINT_SHIFT) - BigInt(1)

  let v = BigInt(encodedDailyData)
  const payout = v & HEARTS_MASK
  v = v >> HEARTS_UINT_SHIFT
  const shares = v & HEARTS_MASK
  v = v >> HEARTS_UINT_SHIFT
  const sats = v & SATS_MASK
  return { payout, shares, sats }
}

const getDecodedDataFromRangeDays = async (
  ctx: BaseContext,
  contract: Contract,
  stakeAndIndex: stakeAndIndexParams,
) => {
  const data = []

  const today = await call({
    ctx,
    target: contract.address,
    abi: {
      constant: true,
      inputs: [],
      name: 'currentDay',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const dataRange = await call({
    ctx,
    target: contract.address,
    params: [BigInt(stakeAndIndex.lockedDays), today],
    abi: {
      constant: true,
      inputs: [
        { internalType: 'uint256', name: 'beginDay', type: 'uint256' },
        { internalType: 'uint256', name: 'endDay', type: 'uint256' },
      ],
      name: 'dailyDataRange',
      outputs: [{ internalType: 'uint256[]', name: 'list', type: 'uint256[]' }],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  for (let i = 0; i < dataRange.length; i++) {
    const dailyData = dataRange[i]

    data.push(HEX_DECODER(dailyData.toString()))
  }
  return data
}

const getInterestForRangeDays = async (ctx: BaseContext, contract: Contract, stakeAndIndex: stakeAndIndexParams) => {
  let interest = 0n

  const decodedData: decodedDataParams[] = await getDecodedDataFromRangeDays(ctx, contract, stakeAndIndex)

  for (let i = 0; i < decodedData.length; i++) {
    const dailyDecodedData = decodedData[i]

    interest += (dailyDecodedData.payout * stakeAndIndex.share) / dailyDecodedData.shares
  }

  return interest
}
