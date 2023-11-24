import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { getMultipleLockerBalances } from '@lib/lock'
import type { Token } from '@lib/token'

const cvxCRV: Token = {
  chain: 'ethereum',
  address: '0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7',
  symbol: 'cvxCRV',
  decimals: 18,
}
const cvxFXS: Token = {
  chain: 'ethereum',
  address: '0xfeef77d3f69374f66429c91d732a244f074bdf74',
  symbol: 'cvxFXS',
  decimals: 18,
}

const FXS: Token = {
  chain: 'ethereum',
  address: '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0',
  symbol: 'FXS',
  decimals: 18,
}

const CVX: Contract = {
  chain: 'ethereum',
  address: '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b',
  symbol: 'CVX',
  decimals: 18,
}

export async function getConvexLockerBalances(ctx: BalancesContext, locker: Contract): Promise<Balance[]> {
  return getMultipleLockerBalances(ctx, locker, CVX, [cvxCRV, cvxFXS, FXS], true)
}
