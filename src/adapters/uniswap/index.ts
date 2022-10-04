import { gql, request } from "graphql-request";
import { Adapter, Contract } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getUnderlyingBalances } from "@lib/uniswap/v2/pair";

async function getPoolsHighestVolume() {
  const contracts: Contract[] = [];

  const url = "https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2";

  const query = gql`
    query pairsQuery {
      pairs(first: 500, orderBy: volumeUSD, orderDirection: desc) {
        id
        token0 {
          id
          symbol
          decimals
        }
        token1 {
          id
          symbol
          decimals
        }
      }
    }
  `;

  const res = await request(url, query);

  for (const pair of res.pairs) {
    if (!pair.id || !pair.token0?.id || !pair.token1?.id) {
      continue;
    }

    contracts.push({
      chain: "ethereum",
      address: pair.id.toLowerCase(),
      name: "Uniswap V2",
      symbol: "UNIV2",
      decimals: 18,
      underlyings: [
        {
          chain: "ethereum",
          address: pair.token0.id.toLowerCase(),
          symbol: pair.token0.symbol,
          decimals: parseInt(pair.token0.decimals),
        },
        {
          chain: "ethereum",
          address: pair.token1.id.toLowerCase(),
          symbol: pair.token1.symbol,
          decimals: parseInt(pair.token1.decimals),
        },
      ],
    });
  }

  return contracts;
}

const adapter: Adapter = {
  id: "uniswap",
  async getContracts() {
    const pairs = await getPoolsHighestVolume();

    return {
      contracts: pairs,
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {
    let lpBalances = await getERC20BalanceOf(ctx, "ethereum", contracts);
    lpBalances = await getUnderlyingBalances("ethereum", lpBalances);

    return {
      balances: lpBalances,
    };
  },
};

export default adapter;

adapter.getContracts();
