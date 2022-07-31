import { Call, Fetcher } from "./adapter";

export const abi = {
  balanceOf: {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  decimals: {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  symbol: {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
};

export function getERC20Fetcher({
  chain,
  address,
  symbol,
  decimals,
}: {
  chain: string;
  address: string;
  symbol?: string;
  decimals?: number;
}): Fetcher {
  return {
    chain,
    address,
    getCalls(context) {
      const calls: Call[] = [
        {
          chain,
          target: address,
          params: [context.account],
          abi: abi.balanceOf,
        },
      ];

      if (!symbol) {
        calls.push({
          chain,
          target: address,
          params: [],
          abi: abi.symbol,
        });
      }

      if (!decimals) {
        calls.push({
          chain,
          target: address,
          params: [],
          abi: abi.decimals,
        });
      }

      return calls;
    },
    async getBalances(context) {
      return [
        {
          chain,
          address: address,
          amount: context.calls[0].output,
          // TODO: resolve optional calls above
          decimals: 18,
          // decimals: parseInt(context.calls[1].output),
        },
      ];
    },
  };
}
