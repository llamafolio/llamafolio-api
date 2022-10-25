import { Chain } from "@defillama/sdk/build/general";
import { BigNumber } from "ethers";
import { Balance, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { getERC20Details } from "@lib/erc20";
import { multicall } from "@lib/multicall";

const Aave: Contract = {
  name: "Aave Token",
  address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  chain: "ethereum",
  symbol: "AAVE",
  decimals: 18,
};

const wETH: Contract = {
  name: "Aave Token",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  chain: "ethereum",
  symbol: "WETH",
  decimals: 18,
};

const BPT: Contract = {
  name: "Balancer Pool Token",
  address: "0xc697051d1c6296c24ae3bcef39aca743861d9a81",
  chain: "ethereum",
  symbol: "BPT-Aave-wETH",
};

export async function getUnderlyingsBalances(chain: Chain, balance: BigNumber) {
  const underlyingsBalances: Balance[] = [];

  const underlyingsTokensAddressesRes = await call({
    chain,
    target: BPT.address,
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
      target: BPT.address,
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
        target: BPT.address,
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

  /**
   *   UnderlyingsRate represents the weight of their price relative to each other
   *   ex: UnderlyingsRate * Aave = wETH -->  (17Aave(USD) = 1wETH(USD))
   *   NormalizedWeight represents the rate of each assets in pool
   *   ex: Aave(80%) - wETH(20%)
   */

  const AaveWeightRatio =
    (normalizedWeight[0] / normalizedWeight[1]) * (underlyingsRate / 10 ** 18);

  const ratio = Math.round((AaveWeightRatio / (AaveWeightRatio + 1)) * 10 ** 4); // * 10 **4  to prevent underflow since BigNumber doesnt like floating number.

  /**
   *  Need to find logic for retrieve APY
   */

  const APY = 1.07;

  balance = balance.mul(APY * 10 ** 3); // * 10 ** 3 to prevent underflow from floating APY number

  const amount_Aave = balance.mul(ratio);
  const amount_ETH = balance.mul(10 ** 4 - ratio);

  const aave_Balances: any = {
    chain,
    address: Aave.address,
    decimals: Aave.decimals,
    symbol: Aave.symbol,
    amount: amount_Aave.div(10 ** 10),
  };
  underlyingsBalances.push(aave_Balances);

  const eth_Balances: any = {
    chain,
    address: wETH.address,
    decimals: wETH.decimals,
    symbol: wETH.symbol,
    amount: amount_ETH.div(10 ** 10),
  };
  underlyingsBalances.push(eth_Balances);

  return underlyingsBalances;
}
