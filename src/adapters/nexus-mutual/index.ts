import { Adapter, Balance, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { providers } from '@lib/providers'
import { BigNumber, ethers } from 'ethers'

import abiNXM from './abi/abi.json'

const NXM: Contract = {
  name: 'NXM',
  chain: 'ethereum',
  address: '0xd7c49CEE7E9188cCa6AD8FF264C1DA2e69D4Cf3B',
  decimals: 18,
}

const wNXM: Contract = {
  name: 'Wrapped NXM',
  chain: 'ethereum',
  address: '0x0d438f3b5175bebc262bf23753c1e53d03432bde',
  decimals: 18,
}

export async function getStakeBalances(ctx: BaseContext, chain: Chain) {
  const provider = providers[chain]

  const stakeContracts = new ethers.Contract('0x84EdfFA16bb0b9Ab1163abb0a13Ff0744c11272f', abiNXM, provider)

  const [stakeAmount, claimableAmount] = await Promise.all([
    stakeContracts.stakerDeposit(ctx.address),
    stakeContracts.stakerReward(ctx.address),
  ])

  const stakeBalances: Balance = {
    amount: BigNumber.from(stakeAmount),
    rewards: [{ ...NXM, amount: BigNumber.from(claimableAmount) }],
    category: 'stake',
    name: NXM.name,
    chain: NXM.chain,
    decimals: NXM.decimals,
    address: NXM.address,
  }

  return [stakeBalances]
}

const getContracts = () => {
  return {
    contracts: [NXM, wNXM],
  }
}

const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BaseContext) => {
  const stakeBalances = await getStakeBalances(ctx, 'ethereum')

  const balances = stakeBalances

  return {
    balances,
  }
}

const adapter: Adapter = {
  id: 'nexus-mutual',
  getContracts,
  getBalances,
}

export default adapter
