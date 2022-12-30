import adapter from '@adapters/wonderland'
import { AdapterTest, BalancesContext, BaseContext } from '@lib/adapter'
import { BigNumber } from 'ethers'

describe.skip('Wonderland avax', () => {
  test.skip('test balances', async () => {
    const testCases: AdapterTest[] = [
      {
        address: '0x024ba2110590dffa4d6b288761c5ee1e78e62cd4',
        blockHeight: 22465369,
        expected: [
          {
            amount: BigNumber.from('181930064070972'),
            symbol: 'wMEMO',
            category: 'stake',
            underlying: [{ amount: BigNumber.from('181930064070972'), symbol: 'TIME' }],
          },
        ],
      },
    ]

    const baseCtx: BaseContext = { adapterId: adapter.id, chain: 'avax' }
    expect(adapter.avax).toBeDefined()
    const contracts = await adapter.avax!.getContracts(baseCtx, {})

    for (const test of testCases) {
      const ctx: BalancesContext = {
        adapterId: adapter.id,
        address: test.address,
        chain: 'avax',
        blockHeight: test.blockHeight,
      }

      const balancesConfig = await adapter.avax!.getBalances(ctx, contracts.contracts, contracts.props)

      expect(balancesConfig.balances).toMatchObject(test.expected)
    }
  })
})
