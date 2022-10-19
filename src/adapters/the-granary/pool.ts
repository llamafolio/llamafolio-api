import { Chain } from "@defillama/sdk/build/general";
import { Contract } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";
import { multicall } from "@lib/multicall";

export async function getContractsFromUnderlyingsLendingPool(
  chain: Chain,
  lendingPoolContract: Contract,
  dataProvider: Contract
) {
  const contracts: Contract[] = [];

  const underlyingsAddressesRes = await call({
    chain,
    target: lendingPoolContract.address,
    params: [],
    abi: {
      inputs: [],
      name: "getReservesList",
      outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const underlyingsAddresses = underlyingsAddressesRes.output;

  const underlyings = await getERC20Details(chain, underlyingsAddresses);

  const calls = underlyings.map((token) => ({
    target: dataProvider.address,
    params: [token.address],
  }));

  const contractsAddressesRes = await multicall({
    chain,
    calls,
    abi: {
      inputs: [{ internalType: "address", name: "asset", type: "address" }],
      name: "getReserveTokensAddresses",
      outputs: [
        { internalType: "address", name: "aTokenAddress", type: "address" },
        {
          internalType: "address",
          name: "stableDebtTokenAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "variableDebtTokenAddress",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const contractsAddresses = contractsAddressesRes
    .filter((res) => res.success)
    .map((res) => res.output.aTokenAddress);

  const contractsInfos = await getERC20Details(chain, contractsAddresses);

  for (let i = 0; i < contractsAddresses.length; i++) {
    const contract = {
      ...contractsInfos[i],
      underlyings: [underlyings[i]],
    };
    contracts.push(contract);
  }
  return contracts;
}
