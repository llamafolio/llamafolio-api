import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { BigNumber } from 'ethers'

export async function getLockerBalances(ctx: BaseContext, chain: Chain, contract?: Contract) {
  const balances: Balance[] = []

  if (!contract || !contract.rewards || !contract.underlyings) {
    console.log('Missing locker contract')

    return []
  }

  interface BalanceWithExtraProps extends Balance {
    lockEnd: string
  }

  try {
    const [lockerBalanceRes, claimableBalanceRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          name: 'locked',
          outputs: [
            {
              type: 'int128',
              name: 'amount',
            },
            {
              type: 'uint256',
              name: 'end',
            },
          ],
          inputs: [
            {
              type: 'address',
              name: 'arg0',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      }),

      call({
        chain,
        target: contract.rewards?.[0].address,
        params: [ctx.address],
        abi: {
          name: 'claim',
          outputs: [
            {
              type: 'uint256',
              name: '',
            },
          ],
          inputs: [
            {
              type: 'address',
              name: '_addr',
            },
          ],
          stateMutability: 'view',
          type: 'function',
        },
      }),
    ])

    const lockerBalance = BigNumber.from(lockerBalanceRes.output.amount)
    const lockEnd = lockerBalanceRes.output.end
    const claimableBalance = BigNumber.from(claimableBalanceRes.output)

    const balance: BalanceWithExtraProps = {
      chain,
      symbol: contract.underlyings?.[0].symbol,
      decimals: contract.underlyings?.[0].decimals,
      address: contract.underlyings?.[0].address,
      amount: lockerBalance,
      lockEnd,
      rewards: [{ ...contract.rewards?.[0].underlyings?.[0], amount: claimableBalance }],
      category: 'lock',
    }

    balances.push(balance)
    return balances
  } catch (error) {
    console.log('Failed to get locker balances')

    return []
  }
}
