import { AdapterTest, BaseContext, parseBalancesTest } from '@lib/adapter'

import adapter from '.'

const testCases: AdapterTest[] = [
  {
    address: '0x024ba2110590dffa4d6b288761c5ee1e78e62cd4',
    blockHeight: { avax: 22465369 },
    expected: {
      avax: [
        {
          amount: '181930064070972',
          symbol: 'wMEMO ',
          category: 'stake',
          underlying: [{ amount: '181930064070972', symbol: 'TIME' }],
        },
      ],
    },
  },
]

describe('wonderland test', () => {
  test('test balances', async () => {
    const contracts = await adapter.getContracts({})

    for (const test of testCases) {
      const ctx: BaseContext = { address: test.address, blockHeight: test.blockHeight }

      const balancesConfig = await adapter.getBalances(ctx, contracts.contracts)

      const balances = parseBalancesTest(balancesConfig)

      expect(balances).toEqual(test.expected)
    }
  })
})
