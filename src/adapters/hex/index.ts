import { Adapter, Balance, Contract, GetBalancesHandler } from '@lib/adapter'
import { range } from '@lib/array'
import { resolveBalances } from '@lib/balance'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { sumBN } from '@lib/math'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  stakeCount: {
    constant: true,
    inputs: [{ internalType: 'address', name: 'stakerAddr', type: 'address' }],
    name: 'stakeCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
}

const HEX: Contract = {
  name: 'HEX',
  chain: 'ethereum',
  address: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
  decimals: 8,
  symbol: 'HEX',
}

const getStakeBalances = async (ctx: any, chain: Chain, hexContract: Contract) => {
  const stakeCountRes = await call({
    chain,
    target: hexContract.address,
    params: [ctx.address],
    abi: abi.stakeCount,
  })

  const stakeCount = parseInt(stakeCountRes.output)

  const stakeListsRes = await multicall({
    chain,
    calls: range(0, stakeCount).map((i) => ({
      target: hexContract.address,
      params: [ctx.address, i],
    })),
    abi: {
      constant: true,
      inputs: [
        { internalType: 'address', name: '', type: 'address' },
        { internalType: 'uint256', name: '', type: 'uint256' },
      ],
      name: 'stakeLists',
      outputs: [
        { internalType: 'uint40', name: 'stakeId', type: 'uint40' },
        { internalType: 'uint72', name: 'stakedHearts', type: 'uint72' },
        { internalType: 'uint72', name: 'stakeShares', type: 'uint72' },
        { internalType: 'uint16', name: 'lockedDay', type: 'uint16' },
        { internalType: 'uint16', name: 'stakedDays', type: 'uint16' },
        { internalType: 'uint16', name: 'unlockedDay', type: 'uint16' },
        { internalType: 'bool', name: 'isAutoStake', type: 'bool' },
      ],
      payable: false,
      stateMutability: 'view',
      type: 'function',
    },
  })

  const stakeAmount = sumBN(
    stakeListsRes.filter((res) => res.success).map((res) => BigNumber.from(res.output.stakedHearts)),
  )

  const stakeBalance: Balance = {
    ...hexContract,
    rewards: undefined,
    underlyings: undefined,
    amount: stakeAmount,
    category: 'stake',
  }

  return stakeBalance
}

const getContracts = () => {
  return {
    contracts: { HEX },
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, 'ethereum', contracts, { HEX: getStakeBalances })

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'hex',
  getContracts,
  getBalances,
}

export default adapter
