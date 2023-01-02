import { BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { sumBN } from '@lib/math'
import { BigNumber } from 'ethers'

interface stakeAndIndexParams {
  stakeId: number
  stake: string
  share: string
  stakedDays: string
  lockedDays: string
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
  const rewards: BigNumber[] = []

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

  const currentDayRes = await call({
    ctx,
    target: contract.address,
    params: [],
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

  const today = currentDayRes.output

  const dataRangeRes = await call({
    ctx,
    target: contract.address,
    params: [stakeAndIndex.lockedDays, today],
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

  const dataRange = dataRangeRes.output

  for (let i = 0; i < dataRange.length; i++) {
    const dailyData = dataRange[i]

    data.push(HEX_DECODER(dailyData))
  }
  return data
}

const getInterestForRangeDays = async (ctx: BaseContext, contract: Contract, stakeAndIndex: stakeAndIndexParams) => {
  const interest: BigNumber[] = []

  const decodedData: decodedDataParams[] = await getDecodedDataFromRangeDays(ctx, contract, stakeAndIndex)

  for (let i = 0; i < decodedData.length; i++) {
    const dailyDecodedData = decodedData[i]

    interest.push(
      BigNumber.from(dailyDecodedData.payout)
        .mul(BigNumber.from(stakeAndIndex.share))
        .div(BigNumber.from(dailyDecodedData.shares)),
    )
  }

  return sumBN(interest)
}
