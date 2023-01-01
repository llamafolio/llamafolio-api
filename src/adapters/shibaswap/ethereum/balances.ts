import { Balance, BalancesContext } from '@lib/adapter'
import { providers } from '@lib/providers'
import { Token } from '@lib/token'
import { BigNumber, ethers } from 'ethers'

import LockerAbi from '../abis/Locker.json'
import StakerAbi from '../abis/Staker.json'

const bone: Token = {
  chain: 'ethereum',
  symbol: 'BONE',
  decimals: 18,
  address: '0x9813037ee2218799597d83d4a5b6f3b6778218d9',
}

export async function getStakerBalances(ctx: BalancesContext, address: string): Promise<Balance[]> {
  const provider = providers[ctx.chain]
  const Staker = new ethers.Contract(address, StakerAbi, provider)

  const stakedBone = await Staker.balanceOf(ctx.address)

  return [
    {
      ...bone,
      category: 'stake',
      amount: BigNumber.from(stakedBone),
    },
  ]
}

export async function getLockerBalances(ctx: BalancesContext, address: string): Promise<Balance[]> {
  const provider = providers[ctx.chain]
  const Locker = new ethers.Contract(address, LockerAbi, provider)

  const remainingLocker = await Locker.unclaimedTokensByUser(ctx.address)

  return [
    {
      ...bone,
      category: 'lock',
      amount: BigNumber.from(remainingLocker),
    },
  ]
}
