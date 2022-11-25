import { call } from '@defillama/sdk/build/abi'
import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

interface BalanceWithExtraProps extends Balance {
  lock: { end: number }
}

const CRVToken: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const IIICrvToken: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3Crv',
}

export async function getLockerBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract,
): Promise<BalanceWithExtraProps[]> {
  const balances: BalanceWithExtraProps[] = []

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

  balances.push({
    chain,
    symbol: CRVToken.symbol,
    decimals: CRVToken.decimals,
    address: CRVToken.address,
    amount: lockerBalance,
    lock: { end: lockEnd },
    rewards: [{ ...IIICrvToken, amount: claimableBalance }],
    category: 'lock',
  })

  return balances
}
