import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { Contract } from "@lib/adapter";
import { range } from "@lib/array";
import { getERC20Details2 } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";

export async function getPoolsContracts(chain: Chain, contract: Contract) {
  const poolsLengthRes = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: "poolLength",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const poolsLength = poolsLengthRes.output;

  const poolsInfoRes = await multicall({
    chain,
    calls: range(0, poolsLength).map((i) => ({
      target: contract.address,
      params: [i],
    })),
    abi: {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      name: "poolInfo",
      outputs: [
        { internalType: "address", name: "stakeToken", type: "address" },
        { internalType: "uint256", name: "allocPoint", type: "uint256" },
        {
          internalType: "uint256",
          name: "lastRewardBlock",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "accAlpacaPerShare",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "accAlpacaPerShareTilBonusEnd",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  return poolsInfoRes
    .filter((res) => res.success)
    .map((res) => res.output.stakeToken);
}

export async function getContractsInfos(
  chain: Chain,
  poolsContracts: string[]
) {
  const contracts: Contract[] = [];

  const calls = poolsContracts.map((token: string) => ({
    target: token,
    params: [],
  }));

  const [contractsAddressesRes, totalTokenRes, totalSupplyRes] =
    await Promise.all([
      multicall({
        chain,
        calls,
        abi: {
          inputs: [],
          name: "token",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),
      multicall({
        chain,
        calls,
        abi: {
          inputs: [],
          name: "totalToken",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
      multicall({
        chain,
        calls,
        abi: {
          inputs: [],
          name: "totalSupply",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

  const contractsAddresses = contractsAddressesRes.map((res) => res.output);

  const contractsInfos = await getERC20Details2(chain, contractsAddresses);

  for (let i = 0; i < poolsContracts.length; i++) {
    if (
      contractsInfos[i] &&
      totalTokenRes[i].success &&
      totalSupplyRes[i].success
    ) {
      const totalToken = BigNumber.from(totalTokenRes[i].output);
      const totalSupply = BigNumber.from(totalSupplyRes[i].output);

      const contract = {
        ...contractsInfos[i],
        associatedWithPoolNumber: i,
        totalToken,
        totalSupply,
      };
      contracts.push(contract);
    }
  }
  return contracts;
}
