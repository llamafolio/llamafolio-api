import { AdapterTest, BaseContext, parseBalancesTest } from '@lib/adapter'

import adapter from '.'

const testCases: AdapterTest[] = [
  {
    address: '0xf93c610dd478d2e9fa47aa00ee3b726c6ac1c376',
    blockHeight: { avax: 22465369 },
    expected: { avax: [{ amount: '69081772623', category: 'stake' }] },
  },
]

describe('adapter test', () => {
  test('test balances', async () => {
    const contracts = await adapter.getContracts()

    for (const test of testCases) {
      const ctx: BaseContext = { address: test.address, blockHeight: test.blockHeight }

      const balancesConfig = await adapter.getBalances(ctx, contracts.contracts)

      const balances = parseBalancesTest(balancesConfig)

      expect(balances).toEqual(test.expected)
    }
  })
})
