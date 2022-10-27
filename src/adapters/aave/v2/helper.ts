import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { Balance, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { getERC20Details } from "@lib/erc20";
import { multicall } from "@lib/multicall";

export async function getUnderlyingsBalances(
  chain: Chain,
  balance: BigNumber,
  contract?: Contract
) {
  if (!contract) {
    return [];
  }

  try {
    const underlyingsBalances: Balance[] = [];

    const underlyingsTokensAddressesRes = await call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        constant: true,
        inputs: [],
        name: "getCurrentTokens",
        outputs: [
          { internalType: "address[]", name: "tokens", type: "address[]" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    });

    const underlyingsTokensAddresses = underlyingsTokensAddressesRes.output;
    const underlyingsTokens = await getERC20Details(
      chain,
      underlyingsTokensAddresses
    );

    const [underlyingsRateRes, normalizedWeightRes] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [underlyingsTokensAddresses[0], underlyingsTokensAddresses[1]],
        abi: {
          constant: true,
          inputs: [
            { internalType: "address", name: "tokenIn", type: "address" },
            { internalType: "address", name: "tokenOut", type: "address" },
          ],
          name: "getSpotPrice",
          outputs: [
            { internalType: "uint256", name: "spotPrice", type: "uint256" },
          ],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      }),

      multicall({
        chain,
        calls: underlyingsTokens.map((token) => ({
          target: contract.address,
          params: [token.address],
        })),
        abi: {
          constant: true,
          inputs: [{ internalType: "address", name: "token", type: "address" }],
          name: "getNormalizedWeight",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const underlyingsRate = underlyingsRateRes.output;
    const normalizedWeight = normalizedWeightRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const DECIMALS_TOKENS_POOL = 10 ** 18;

    /**
     *   UnderlyingsRate represents the weight of their price relative to each other
     *   ex: UnderlyingsRate * Aave = wETH, if UnderlyingsRate = 17 then -->  (17Aave(USD) = 1wETH(USD))
     *   NormalizedWeight represents the rate of each assets in pool
     *   ex: Underlyings_0_(80%) - Underlyings_1_(20%)
     *   Finally, underlying_0_weightRatio represents how much tokens_0_ we need to equal tokens_1_ in pool
     */

    const underlying_0_weightRatio =
      (normalizedWeight[0] / normalizedWeight[1]) *
      (underlyingsRate / DECIMALS_TOKENS_POOL);

    /**
     * ratio represents the percentage share of token_0_ in pool, (1-ratio) represents token_1_
     */

    const ratio = Math.round(
      (underlying_0_weightRatio / (underlying_0_weightRatio + 1)) * 10 ** 4
    ); // mul 10 ** 4 to prevent underflow error since BigNumber doesn't really like floating number

    /**
     *  /!\  -  Need to find logic for retrieve APY
     */

    const APY = 1.085;

    balance = balance.mul(APY * 10 ** 3); // * 10 ** 3 to prevent underflow from floating APY number

    const underlying_0_amount = balance.mul(ratio);
    const underlying_1_amount = balance.mul(10 ** 4 - ratio);

    const underlying_0_balance: Balance = {
      chain,
      address: underlyingsTokens[0].address,
      decimals: underlyingsTokens[0].decimals,
      symbol: underlyingsTokens[0].symbol,
      amount: underlying_0_amount.div(10 ** 10),
    };

    const underlying_1_balance: Balance = {
      chain,
      address: underlyingsTokens[1].address,
      decimals: underlyingsTokens[1].decimals,
      symbol: underlyingsTokens[1].symbol,
      amount: underlying_1_amount.div(10 ** 10),
    };

    underlyingsBalances.push(underlying_0_balance, underlying_1_balance);

    return underlyingsBalances;
  } catch (error) {
    return []
  }
}
