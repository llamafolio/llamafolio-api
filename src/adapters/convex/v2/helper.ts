import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BigNumber, utils } from "ethers";
import { Contract, Balance } from "@lib/adapter";
import { multicall } from "@lib/multicall";
import { ETH_ADDR } from "@lib/token";
import { ethers } from "ethers";
import { getERC20Details } from "@lib/erc20";
import { BalanceWithExtraProps } from "@adapters/curve/helper";

export const MetaRegistry: Contract = {
  chain: "ethereum",
  address: "0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC",
};

export async function getCVXRatio(
  chain: Chain,
  contract?: Contract,
  earnedBalances?: BigNumber
) {
  if (!contract || !earnedBalances) {
    console.log("Missing CVX contract or balance");

    return [];
  }

  const totalSupplyRes = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const cvxTotalSupply = BigNumber.from(totalSupplyRes.output);

  const CLIFFSIZE = BigNumber.from(10 ** 5).mul(utils.parseEther("1.0"));
  const MAXSUPPLY = BigNumber.from(10 ** 8).mul(utils.parseEther("1.0"));
  const CLIFFCOUNT = BigNumber.from(10 ** 3);

  const currentCliff = cvxTotalSupply.div(CLIFFSIZE);

  if (currentCliff.lt(MAXSUPPLY)) {
    const remainingCliff = CLIFFCOUNT.sub(currentCliff);

    return earnedBalances.mul(remainingCliff).div(CLIFFCOUNT);
  }
  return BigNumber.from(0);
}

export async function getPoolsContractsFromLpTokens(
  chain: Chain,
  lpToken?: Contract
) {
  const pools: Contract[] = [];

  if (!lpToken) {
    console.log("Missing or incorrect lpToken");

    return [];
  }

  try {
    const getPoolAddressFromLpTokenRes = await call({
      chain,
      target: MetaRegistry.address,
      params: [lpToken.address],
      abi: {
        stateMutability: "view",
        type: "function",
        name: "get_pool_from_lp_token",
        inputs: [{ name: "arg0", type: "address" }],
        outputs: [{ name: "", type: "address" }],
        gas: 2443,
      },
    });

    const poolAddressFromLpToken = getPoolAddressFromLpTokenRes.output;

    const calls = [poolAddressFromLpToken].map((address: string) => ({
      target: MetaRegistry.address,
      params: [address],
    }));

    const [coinsAddressesResponse, underlyingsAddressesResponse] =
      await Promise.all([
        multicall({
          chain,
          calls,
          abi: {
            stateMutability: "view",
            type: "function",
            name: "get_coins",
            inputs: [{ name: "_pool", type: "address" }],
            outputs: [{ name: "", type: "address[8]" }],
          },
        }),

        multicall({
          chain,
          calls,
          abi: {
            stateMutability: "view",
            type: "function",
            name: "get_underlying_coins",
            inputs: [{ name: "_pool", type: "address" }],
            outputs: [{ name: "", type: "address[8]" }],
          },
        }),
      ]);

    const coinsAddressesRes = coinsAddressesResponse
      .filter((res) => res.success)
      .map((res) => res.output);

    const underlyingsAddressesRes = underlyingsAddressesResponse
      .filter((res) => res.success)
      .map((res) => res.output);

    const coinsAddresses = [];
    const underlyingsAddresses = [];

    for (let i = 0; i < coinsAddressesRes.length; i++) {
      coinsAddresses.push(
        coinsAddressesRes[i]
          .filter(
            (coin: string) =>
              coin.toLowerCase() !== ethers.constants.AddressZero
          )
          .map((coin: string) =>
            coin.toLowerCase() === ETH_ADDR
              ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
              : coin
          )
      );
      underlyingsAddresses.push(
        underlyingsAddressesRes[i]
          .filter(
            (coin: string) =>
              coin.toLowerCase() !== ethers.constants.AddressZero
          )
          .map((coin: string) =>
            coin.toLowerCase() === ETH_ADDR
              ? "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
              : coin
          )
      );
    }

    const tokens = await getERC20Details(chain, coinsAddresses[0]);
    const underlyings = await getERC20Details(chain, underlyingsAddresses[0]);

    pools.push({
      ...lpToken,
      lpToken: lpToken.address,
      poolAddress: poolAddressFromLpToken,
      tokens,
      underlyings,
    });

    return pools;
  } catch (error) {
    console.log("Failed to get details pool from curve");

    return [];
  }
}

export async function getUnderlyingsRewardsBalances(
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  for (let i = 0; i < contracts.length; i++) {
    const [totalSupplyRes, underlyingsBalancesRes] = await Promise.all([
      call({
        chain,
        target: contracts[i].lpToken,
        params: [],
        abi: {
          stateMutability: "view",
          type: "function",
          name: "totalSupply",
          inputs: [],
          outputs: [
            {
              name: "",
              type: "uint256",
            },
          ],
          gas: 3240,
        },
      }),

      call({
        chain,
        target: MetaRegistry.address,
        params: [contracts[i].poolAddress],
        abi: {
          stateMutability: "view",
          type: "function",
          name: "get_underlying_balances",
          inputs: [{ name: "_pool", type: "address" }],
          outputs: [{ name: "", type: "uint256[8]" }],
        },
      }),
    ]);

    const underlyingsBalances: BigNumber[] = underlyingsBalancesRes.output.map(
      (res: string) => BigNumber.from(res)
    );

    underlyingsBalances.filter((amount) => amount.gt(0));

    const totalSupply = BigNumber.from(totalSupplyRes.output);

    /**
     *  Updating pool amounts from the fraction of each underlyings
     */

    const formattedUnderlyings = contracts[i].underlyings?.map(
      (underlying, x) => ({
        ...underlying,
        amount:
          underlying.decimals &&
          contracts[i].amount.mul(underlyingsBalances[x]).div(totalSupply),
        decimals: underlying.decimals,
      })
    );

    if (formattedUnderlyings) {
      for (let y = 0; y < formattedUnderlyings.length; y++) {
        const balance: BalanceWithExtraProps = {
          chain,
          symbol: contracts[i].tokens[y].symbol,
          address: formattedUnderlyings[y].address,
          amount: formattedUnderlyings[y].amount,
          decimals: formattedUnderlyings[y].decimals,
        };
        balances.push(balance);
      }
    }
  }

  return balances;
}
