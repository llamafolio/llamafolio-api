import { BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'

const abiWonderland = {
  rewardTokenLength: {
    constant: true,
    inputs: [],
    name: 'rewardTokenLength',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  rewardTokens: {
    constant: true,
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rewardTokens',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const wMEMO: Contract = {
  name: 'Wrapped MEMO',
  displayName: 'Wrapped MEMO',
  chain: 'avax',
  address: '0x0da67235dd5787d67955420c84ca1cecd4e5bb3b',
  decimals: 18,
  symbol: 'wMEMO ',
}

export async function getRewardsMEMOFarmTokens(ctx: BaseContext, wMEMOFarm: Contract): Promise<Contract> {
  const rewardTokenLengthRes = await call({
    ctx,
    target: wMEMOFarm.address,
    params: [],
    abi: abiWonderland.rewardTokenLength,
  })

  const rewardTokenLength = parseInt(rewardTokenLengthRes.output)

  const rewardTokensRes = await multicall({
    ctx,
    calls: range(0, rewardTokenLength).map((i) => ({
      target: wMEMOFarm.address,
      params: [i],
    })),
    abi: abiWonderland.rewardTokens,
  })

  const rewardTokens = rewardTokensRes.filter(isSuccess).map((res) => res.output)

  return {
    chain: ctx.chain,
    address: wMEMOFarm.address,
    underlyings: [wMEMO],
    rewards: rewardTokens,
  }
}
