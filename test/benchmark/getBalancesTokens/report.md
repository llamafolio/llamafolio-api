# WIP

-

Observations:

- Optimism very slow,
- Defillama price API fails not infrequently,
- Optimism very slow.

to test test the performance gain/loss between getBalancesTokens v1 and v2, I
first ran benchmarks on v1 with:

```sh
pnpm vitest bench test/bench --outputFile.json='test/benchmark/reports/v1_getBalancesTokens.json'
```

The benchmark test is in `./test/benchmark/getBalancesTokens.bench.ts`:

```ts
import { getApiURL } from 'test/config/api-url'
import { bench, describe } from 'vitest'
const apiURL = getApiURL('local')
const walletAddress = '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'
const getBalancesTokens = async (address: string) =>
  fetch(`${apiURL}/balances/${address}/tokens`).then((res) => res.json())
describe('getTokensBalances', () => {
  bench('v1', async () => await getBalancesTokens(walletAddress), { iterations: 100 })
})
```

Once the test completed, I implemented my changes (`v2`) and ran the same benchmark test again.

Then, I compared the results of both tests and generated this table report:

```

```
