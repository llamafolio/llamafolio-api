import { cmd } from '@lib/cmd'
import { evmClient } from '@lib/providers/v2/provider'
import { wait } from '@lib/wait'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

// const client = createTestClient({
//   chain: foundry,
//   mode: 'anvil',
//   transport: http(),
// })
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
    await cmd(
      /* @see https://github.com/foundry-rs/foundry/blob/master/anvil/src/cmd.rs for all args */
      'anvil',
      '--chain-id=1',
      '--balance=10000', // default is 10000
      '--port=8545', // default is 8545
    )
    // wait for anvil to start
    wait(2_000)
  })

  test.todo('[local]: getBlockNumber', async () => {
    const client = evmClient('localhost', { protocol: 'http' })
    const blockNumber = await client.getBlockNumber()
    expect(blockNumber).toBeGreaterThan(0)
  })

  afterAll(async () => {
    // stop local node
    await cmd('killall', 'anvil')
  })
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
