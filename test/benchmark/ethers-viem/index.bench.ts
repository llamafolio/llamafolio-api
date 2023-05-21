import { supportedNetworks } from '@lib/erc20/contract'
import { getERC20BalanceOf } from '@lib/erc20/index'
import { evmClient } from '@lib/provider'
import { getAddress } from 'viem'
import { bench, describe } from 'vitest'

import { testData } from '../../fixtures/test-data'

const chains = [
  //
  'harmony',
  ...supportedNetworks,
] as const

// ;(async () => {
//   const clients = chains.map((network) => [
//     network,
//     evmClient(network, {
//       protocol: 'http',
//       options: {
//         batch: { multicall: { batchSize: 1_024 * 2, wait: 18 } },
//       },
//     }),
//   ]) satisfies Array<[(typeof chains)[number], ReturnType<typeof evmClient>]>
//   const balances = await Promise.all(
//     clients.map(async ([chain, client]) => ({
//       network: chain,
//       balances: await getERC20BalanceOf({
//         client,
//         address: getAddress(testData.address),
//         chain: chain,
//       }),
//     })),
//   )
//   const filtered = balances
//   // .map((f) => ({
//   //   network: f.network,
//   //   balances: f.balances.filter((b) => b.amount > 0),
//   // }))
//   console.log(
//     // balances,
//     filtered.map((f) => f.balances.length).reduce((a, b) => a + b, 0),
//   )

//   fs.writeFileSync('viem_balances.json', JSON.stringify(filtered, null, 2))
// })()

describe.only('getERC20BalanceOf', () => {
  const clients = chains.map((network) => [
    network,
    evmClient(network, {
      protocol: 'http',
      options: {
        batch: { multicall: { batchSize: 1_024 * 2, wait: 18 } },
      },
    }),
  ]) satisfies Array<[(typeof chains)[number], ReturnType<typeof evmClient>]>
  bench(
    'viem',
    async () => {
      const balances = await Promise.all(
        clients.map(async ([chain, client]) => ({
          network: chain,
          balances: await getERC20BalanceOf({
            client,
            address: getAddress(testData.address),
            chain: chain,
          }),
        })),
      )
      console.log(
        // balances,
        balances.map((f) => f.balances.length).reduce((a, b) => a + b, 0),
      )

      // fs.writeFileSync('viem_balances.json', JSON.stringify(balances, null, 2))
    },
    { iterations: 10 },
  )
})
