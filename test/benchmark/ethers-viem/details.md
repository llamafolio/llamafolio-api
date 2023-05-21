### Objective:

See if `viem`'s builtin multicaller with fallover, providers ranking, exponential backoff, retries, etc. outperforms current implementation of `ethers` in terms of speed (and possibly if speed is good to the point where we can call against many tokens and not worry about perf degradation).

### Words of caution:

1. Viem implementation/integration as is right now in this branch is not perfect, it's purposely not gold platted unitl we have clear benchmarks to see if it's worth it (which we finally do now),
2. The current `MultiCoinBalanceLookup` smart contract doesn't check for chain native token, that's coming very soon (probably tomorrow),
3. There may be some bugs / mistakes in the tests I overlooked, please let me know if you find any.

Summary:

Here's the data formatted as a Markdown table:

| Participant | Rank | Mean Time (ms) | Min Time (ms) | Max Time (ms) | Standard Deviation (ms) | Relative Margin of Error (%) | Count of Tokens Balances Collected |
| ----------- | ---- | -------------- | ------------- | ------------- | ----------------------- | ---------------------------- | ---------------------------------- |
| viem        | 1    | 785.30         | 637.37        | 1031.85       | 116.58                  | 10.62                        | 194                                |
| ethers      | 2    | 3708.88        | 1013.41       | 10357.90      | 3537.14                 | 68.22                        | 160                                |

(see `./balances/compare.ts` for the list of tokens balances collected)

Based on the results, "viem" outperformed in this test with a significantly lower mean time (785.30 ms) compared to "ethers" (3708.88 ms).

The benchmark test for `ethers` was ran in `master` branch with the following code:

```ts
// test/benchmark/ethers-viem/index.bench.ts
import { chains as _chains } from '@lib/chains'
import { getERC20BalanceOf } from '@lib/erc20'
import * as tokenChains from '@llamafolio/tokens'
import { testData } from 'test/fixtures/test-data'
import { bench, describe } from 'vitest'

const chains = _chains.map(({ id }) => id)

describe.only('getERC20BalanceOf', () => {
  bench('ethers', async () => {
    const balances = await Promise.all(
      chains.map(
        async (chain, _index) =>
          await getERC20BalanceOf(
            {
              chain,
              address: testData.address,
            } as any,
            tokenChains.chains[chain] as any,
          ),
      ),
    )
    console.log(JSON.stringify(balances, undefined, 2), balances.length)
  })
})
```

```sh
pnpm vitest bench test/benchmark/ethers-viem/index.bench.ts \
  --outputFile.json='test/benchmark/ethers-viem/v1-ethers.json' --run
```

The benchmark test for `viem` was ran in `robustify-rpc` branch with code in `test/benchmark/ethers-viem/index.bench.ts`.

```sh
pnpm vitest bench test/benchmark/ethers-viem/index.bench.ts \
  --outputFile.json='test/benchmark/ethers-viem/v1-viem.json' --run
```

Other observations:

- The tokens lists is missing a number of important tokens
