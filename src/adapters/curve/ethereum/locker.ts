import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getSingleLockerBalance } from '@lib/lock'
import { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  claim: {
    name: 'claim',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'address', name: '_addr' }],
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
): Promise<Balance> {
  const [lockedBalance, { output: claimableBalanceRes }] = await Promise.all([
    getSingleLockerBalance(ctx, contract, CRV, 'locked'),
    call({
      ctx,
      target: feeDistributorContract.address,
      params: [ctx.address],
      abi: abi.claim,
    }),
  ])

  return { ...lockedBalance, rewards: [{ ...triCrv, amount: BigNumber.from(claimableBalanceRes) }] }
}
