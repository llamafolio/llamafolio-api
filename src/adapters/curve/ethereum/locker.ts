import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  locked: {
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
  claim: {
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
}

const CRV: Token = {
  chain: 'ethereum',
  address: '0xD533a949740bb3306d119CC777fa900bA034cd52',
  decimals: 18,
  symbol: 'CRV',
}

const triCrv: Token = {
  chain: 'ethereum',
  address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
  decimals: 18,
  symbol: '3Crv',
}

export async function getLockerBalances(
  ctx: BalancesContext,
  contract: Contract,
  feeDistributorContract: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const [lockerBalanceRes, claimableBalanceRes] = await Promise.all([
    call({
      ctx,
      target: contract.address,
      params: [ctx.address],
      abi: abi.locked,
    }),

    call({
      ctx,
      target: feeDistributorContract.address,
      params: [ctx.address],
      abi: abi.claim,
    }),
  ])

  const lockerBalance = BigNumber.from(lockerBalanceRes.output.amount)
  const lockEnd = lockerBalanceRes.output.end
  const claimableBalance = BigNumber.from(claimableBalanceRes.output)

  balances.push({
    chain: ctx.chain,
    symbol: CRV.symbol,
    decimals: CRV.decimals,
    address: CRV.address,
    amount: lockerBalance,
    lock: { end: lockEnd },
    rewards: [{ ...triCrv, amount: claimableBalance }],
    category: 'lock',
  })

  return balances
}
