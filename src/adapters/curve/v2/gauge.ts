import { BigNumber } from "ethers";
import { multicall } from "@lib/multicall";
import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { range } from "@lib/array";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";

const CRVToken: Token = {
  chain: "ethereum",
  address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  decimals: 18,
  symbol: "CRV",
};

export async function getGaugesContracts(
  chain: Chain,
  pools: Contract[],
  gaugeController?: Contract
) {
  const gauges: Contract[] = [];

  if (!gaugeController) {
    return [];
  }

  try {
    const typeGauges: any = {
      0: "ethereum",
      1: "fantom",
      2: "polygon",
      4: "xDai",
      5: "ethereum (crypto pools)",
      7: "arbitrum",
      8: "avalanche",
      9: "harmony",
      11: "optimism",
    };

    const gaugeContractsCountRes = await call({
      chain,
      target: gaugeController.address,
      params: [],
      abi: {
        name: "n_gauges",
        outputs: [
          {
            type: "int128",
            name: "",
          },
        ],
        inputs: [],
        stateMutability: "view",
        type: "function",
      },
    });

    const gaugeContractsAddressesRes = await multicall({
      chain,
      calls: range(0, gaugeContractsCountRes.output).map((i) => ({
        target: gaugeController.address,
        params: [i],
      })),
      abi: {
        name: "gauges",
        outputs: [
          {
            type: "address",
            name: "",
          },
        ],
        inputs: [
          {
            type: "uint256",
            name: "arg0",
          },
        ],
        stateMutability: "view",
        type: "function",
        gas: 2160,
      },
    });

    const gaugeContractsAddresses = gaugeContractsAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const gaugesTypesRes = await multicall({
      chain,
      calls: gaugeContractsAddresses.map((address) => ({
        target: gaugeController.address,
        params: [address],
      })),
      abi: {
        name: "gauge_types",
        outputs: [
          {
            type: "int128",
            name: "",
          },
        ],
        inputs: [
          {
            type: "address",
            name: "_addr",
          },
        ],
        stateMutability: "view",
        type: "function",
        gas: 1625,
      },
    });

    const gaugesTypes = gaugesTypesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    for (let i = 0; i < gaugesTypesRes.length; i++) {
      if ((typeGauges[gaugesTypes[i]] as any) === chain) {
        gauges.push({ chain, address: gaugeContractsAddresses[i] });
      }
    }

    const lpTokensAddressesRes = await multicall({
      chain,
      calls: gauges.map((gauge) => ({
        target: gauge.address,
        params: [],
      })),
      abi: {
        stateMutability: "view",
        type: "function",
        name: "lp_token",
        inputs: [],
        outputs: [
          {
            name: "",
            type: "address",
          },
        ],
      },
    });

    const lpTokensAddresses = lpTokensAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output.toLowerCase());

    const poolByAddress: { [key: string]: Contract } = {};
    for (const pool of pools) {
      poolByAddress[pool.address.toLowerCase()] = pool;
    }

    return gauges
      .map((gauge, i) => {
        if (!lpTokensAddresses[i]) {
          return null;
        }

        const pool = poolByAddress[lpTokensAddresses[i]];

        if (!pool) {
          return null;
        }

        return {
          ...gauge,
          lpToken: lpTokensAddresses[i],
          underlyings: pool.underlyings,
          poolAddress: pool.poolAddress,
        };
      })
      .filter(isNotNullish);
  } catch (error) {
    return [];
  }
}

export async function getGaugesBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  const nonNullContracts = contracts.filter((contract) => contract !== null);

  const [gaugeBalancesListRes, totalSupplyRes, claimableTokensRes] =
    await Promise.all([
      multicall({
        chain,
        calls: nonNullContracts.map((contract) => ({
          target: contract.address,
          params: [ctx.address],
        })),
        abi: {
          constant: true,
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      }),

      multicall({
        chain,
        calls: nonNullContracts.map((contract) => ({
          target: contract.address,
          params: [],
        })),
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

      multicall({
        chain,
        calls: nonNullContracts.map((contract) => ({
          target: contract.address,
          params: [ctx.address],
        })),
        abi: {
          stateMutability: "nonpayable",
          type: "function",
          name: "claimable_tokens",
          inputs: [
            {
              name: "addr",
              type: "address",
            },
          ],
          outputs: [
            {
              name: "",
              type: "uint256",
            },
          ],
          gas: 2683603,
        },
      }),
    ]);

  const gaugeBalancesList = gaugeBalancesListRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const totalSupply = totalSupplyRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const claimableTokens = claimableTokensRes
    .filter((res) => res.success)
    .map((res) => res.output);

  for (let i = 0; i < nonNullContracts.length; i++) {
    // const formattedUnderlyings = nonNullContracts[i].underlyings?.map(
    //     (underlying, x) => ({
    //       ...underlying,
    //       amount:
    //         underlying.decimals &&
    //         nonNullContracts[i].amount
    //           .mul(underlyingsBalances[x].mul(10 ** (18 - underlying.decimals)))
    //           .div(totalSupply),
    //       decimals: 18,
    //     })
    //   );
    if (gaugeBalancesList[i] && gaugeBalancesList[i] !== undefined) {
      const balance: Balance = {
        // ...nonNullContracts[i],
        chain,
        decimals: 18,
        address: nonNullContracts[i].address,
        amount: gaugeBalancesList[i],
        category: "farm",
        yieldKey: nonNullContracts[i].lpToken,
      };

      //   if (claimableTokensRes[i] && claimableTokensRes[i] !== undefined) {
      //     balance.rewards = [{ ...CRVToken, amount: claimableTokens[i] }];
      //   }

      //   if (balance.rewards !== undefined) {
      //     balances.push(balance);
      //   }
      balances.push(balance);
    }
  }
  return balances;
}
