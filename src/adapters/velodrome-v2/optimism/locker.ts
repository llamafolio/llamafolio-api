import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { groupBy, mapSuccess, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  ownerToNFTokenIdList: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'ownerToNFTokenIdList',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  locked: {
    inputs: [{ internalType: 'uint256', name: '_tokenId', type: 'uint256' }],
    name: 'locked',
    outputs: [
      {
        components: [
          { internalType: 'int128', name: 'amount', type: 'int128' },
          { internalType: 'uint256', name: 'end', type: 'uint256' },
          { internalType: 'bool', name: 'isPermanent', type: 'bool' },
        ],
        internalType: 'struct IVotingEscrow.LockedBalance',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  earned: {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

type VelodromeBalance = Balance & {
  tokenId: bigint
}

export async function getLockerFeesBribesBalances(ctx: BalancesContext, locker: Contract, asset: Token) {
  const lockers = await getVelodromeLockerBalances(ctx, locker, asset)

  const feesAndBribes = await getVelodromeBribesBalances(
    ctx,
    locker,
    lockers.map((locker) => locker.tokenId),
  )

  return [...lockers, ...feesAndBribes]
}

async function getVelodromeLockerBalances(
  ctx: BalancesContext,
  locker: Contract,
  asset: Token,
): Promise<VelodromeBalance[]> {
  const userActiveLockers = await call({ ctx, target: locker.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const tokenOfOwnerByIndexesRes = await multicall({
    ctx,
    calls: rangeBI(0n, userActiveLockers).map(
      (idx) => ({ target: locker.address, params: [ctx.address, idx] }) as const,
    ),
    abi: abi.ownerToNFTokenIdList,
  })

  const lockedsRes = await multicall({
    ctx,
    calls: mapSuccess(
      tokenOfOwnerByIndexesRes,
      (tokenIdx) => ({ target: locker.address, params: [tokenIdx.output] }) as const,
    ),
    abi: abi.locked,
  })

  return mapSuccessFilter(lockedsRes, (res) => {
    const now = Date.now() / 1000
    const { amount, end } = res.output
    const unlockAt = Number(end)

    return {
      ...locker,
      amount,
      unlockAt,
      claimable: now > unlockAt ? amount : 0n,
      underlyings: [asset],
      tokenId: res.input.params[0],
      rewards: undefined,
      category: 'lock',
    }
  })
}

async function getVelodromeBribesBalances(
  ctx: BalancesContext,
  locker: Contract,
  lockerIds: bigint[],
): Promise<Balance[]> {
  const callsWithMapping = lockerIds.flatMap((lockerId) =>
    locker.pairs.flatMap((pair: Contract) => [
      ...pair.bribeTokens.map((token: Contract) => ({
        call: { target: pair.bribe, params: [token.address, lockerId] },
        tokenContract: token,
        lockerId: lockerId,
        provider: 'bribe',
      })),
      ...pair.feeTokens.map((token: Contract) => ({
        call: { target: pair.fee, params: [token.address, lockerId] },
        tokenContract: token,
        lockerId: lockerId,
        provider: 'fee',
      })),
    ]),
  )

  const userBalances = await multicall({
    ctx,
    calls: callsWithMapping.map((mapping) => mapping.call),
    abi: abi.earned,
  })

  const underlyings = groupBy(
    mapSuccessFilter(userBalances, (res, index) => {
      if (res.output === 0n) return null
      return {
        ...callsWithMapping[index].tokenContract,
        amount: res.output,
        provider: callsWithMapping[index].provider,
      }
    }).filter(isNotNullish),
    'provider',
  )

  const feeBalance: Balance = {
    chain: ctx.chain,
    address: locker.address,
    symbol: 'FEE',
    amount: 1n,
    underlyings: underlyings.fee,
    rewards: undefined,
    category: 'reward',
  }

  const bribeBalance: Balance = {
    chain: ctx.chain,
    address: locker.address,
    symbol: 'INCENTIVE',
    amount: 1n,
    underlyings: underlyings.bribe,
    rewards: undefined,
    category: 'reward',
  }

  return [feeBalance, bribeBalance]
}
