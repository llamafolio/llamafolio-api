import { getDefinitiveBalances } from '@adapters/definitive.fi/common/balance'
import { getDefinitiveContracts } from '@adapters/definitive.fi/common/pool'
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

const poolAddresses: `0x${string}`[] = [
  '0xC2cA42Ac871753d4623766581b7A963c2AD7209B',
  '0x035569b57390a095b4b3f7754214b39CA3145C75',
  '0xB3E741Ee16Df64eF9274261A397Df6Fd54073FFB',
]

export const getContracts = async (ctx: BaseContext) => {
  const pools = await getDefinitiveContracts(ctx, poolAddresses)
  return {
    contracts: { pools },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pools: getDefinitiveBalances,
  })

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: 1709769600,
}
