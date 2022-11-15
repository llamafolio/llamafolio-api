import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { providers } from '@lib/providers'
import { BigNumber, ethers } from 'ethers'

import LockerAbi from './abis/Locker.json'

export async function getLockerBalances(ctx: BaseContext, chain: Chain, contracts: Contract[]): Promise<Balance[]> {
  const balances = []
  const provider = providers[chain]

  for (let i = 0; i < contracts.length; i++) {
    const contract = contracts[i]

    if (contract.name === 'vectorLocker') {
      const Locker = new ethers.Contract(contract.address, LockerAbi, provider)

      const depositCount = await Locker.getUserDepositLength(ctx.address)

      const calls = []
      for (let index = 0; index < depositCount; index++) {
        calls.push({
          params: [ctx.address, index],
          target: contract.address,
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

      for (let c = 0; c < lockedBalances.length; c++) {
        const lockedBalance = lockedBalances[c]

        balances.push({
          chain: chain,
          category: 'lock',
          symbol: 'VTX',
          decimals: 18,
          address: '0x5817d4f0b62a59b17f75207da1848c2ce75e7af4',
          amount: BigNumber.from(lockedBalance.amount),
          lockEnd: lockedBalance.endTime,
          yieldKey: `vector-VTX-locking`,
        })
      }
    }
  }

  return balances
}
