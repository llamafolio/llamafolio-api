import { Balance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  getUserDepositLength: {
    inputs: [
      {
        internalType: 'address',
        name: '_user',
        type: 'address',
      },
    ],
    name: 'getUserDepositLength',
    outputs: [
      {
        internalType: 'uint256',
        name: 'nbDeposits',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

export async function getLockerBalances(ctx: BaseContext, chain: Chain, vtxLocker: Contract) {
  const depositCountRes = await call({
    chain,
    abi: abi.getUserDepositLength,
    target: vtxLocker.address,
    params: [ctx.address],
  })

  const depositCount = parseInt(depositCountRes.output)

  const calls = []
  for (let index = 0; index < depositCount; index++) {
    calls.push({
      params: [ctx.address, index],
      target: vtxLocker.address,
    })
  }

  const lockedBalancesRes = await multicall({
    chain: chain,
    calls: calls,
    abi: {
      inputs: [
        { internalType: 'address', name: '_user', type: 'address' },
        { internalType: 'uint256', name: 'n', type: 'uint256' },
      ],
      name: 'getUserNthDeposit',
      outputs: [
        { internalType: 'uint256', name: 'depositTime', type: 'uint256' },
        { internalType: 'uint256', name: 'endTime', type: 'uint256' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const lockedBalances = lockedBalancesRes.filter((res) => res.success).map((res) => res.output)

  return lockedBalances.map((lockedBalance) => {
    const balance: Balance = {
      chain: chain,
      category: 'lock',
      symbol: 'VTX',
      decimals: 18,
      address: '0x5817d4f0b62a59b17f75207da1848c2ce75e7af4',
      amount: BigNumber.from(lockedBalance.amount),
      lock: { end: lockedBalance.endTime },
      yieldKey: `vector-VTX-locking`,
    }

    return balance
  })
}
