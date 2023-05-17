import { evmClient } from '@lib/provider/provider'
// import { createTestClient, http } from 'viem'
// import { foundry,mainnet } from 'viem/chains'
import { beforeAll, describe, expect, test } from 'vitest'

/**
 * TODO: WIP
 *
 * Test goals:
 * - [ ] run against local node (anvil - https://github.com/foundry-rs/foundry/blob/master/anvil/README.md)
 *    - [ ] test blockNumber
 *    - [ ] test contract call and interaction
 *
 * - [ ] run against remote node (alchemy, infura, etc)
 *    - [ ] test blockNumber
 *    - [ ] test contract call and interaction
 *    - [ ] test case where all but one provider are down
 */

describe.todo('Local RPC Provider', () => {
  beforeAll(async () => {
    // start local node
    // await cmd(
    //   /* @see https://github.com/foundry-rs/foundry/blob/master/anvil/src/cmd.rs for all args */
    //   'anvil',
    //   '--chain-id=1',
    //   '--balance=10000', // default is 10000
    //   '--port=8545', // default is 8545
    // )
    // // wait for anvil to start
    // wait(2_000)
  })
  // const client = createTestClient({
  //   chain: mainnet,
  //   mode: 'anvil',
  //   transport: http(),
  // })

  test.todo('[local]: getBlockNumber', async () => {
    const client = evmClient('localhost', { protocol: 'http' })
    const blockNumber = await client.getBlockNumber()
    expect(blockNumber).toBeGreaterThan(0)
  })

  // afterAll(async () => {
  //   // stop local node
  //   await cmd('killall', 'anvil')
  // })
})

describe.todo('HTTP RPC Provider', () => {
  test.todo('[http]: getBlockNumber', async () => {
    const client = evmClient('arbitrum')
    const blockNumber = await client.getBlockNumber()
    expect(blockNumber).toBeGreaterThan(0)
  })
})

describe.todo('WS RPC Provider', () => {
  test.todo('[ws]: getBlockNumber', async () => {
    const client = evmClient('arbitrum', { protocol: 'ws' })
    const blockNumber = await client.getBlockNumber()
    expect(blockNumber).toBeGreaterThan(0)
  })
})
