import { AdapterTest, BaseContext, parseBalancesTest } from '@lib/adapter'

import adapter from '.'

const testCases: AdapterTest[] = [
  {
    address: '0x024ba2110590dffa4d6b288761c5ee1e78e62cd4',
    chain: 'avax',
    blockHeight: { avax: 22792815 },
    expected: {
      avax: [
        {
          amount: '181775358645059',
          symbol: 'wMEMO ',
          category: 'stake',
          //underlying: [{ amount: '181930064070972', symbol: 'TIME' }],
        },
      ],
    },
  },
]

describe('wonderland test', () => {
  test('test balances', async () => {
    for (const test of testCases) {
      const adapterHandler = adapter[test.chain]

      if (adapterHandler) {
        const contracts = await adapterHandler.getContracts()

        const ctx: BaseContext = { address: test.address, blockHeight: test.blockHeight }

        const balancesConfig = await adapterHandler.getBalances(ctx, contracts.contracts)

        const balances = parseBalancesTest(balancesConfig)

        expect(balances).toEqual(test.expected)
      }
    }
  })
})
