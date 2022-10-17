import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { Contract } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";

export async function getPoolsContracts(chain: Chain, contract: Contract) {
  const contractsAddresses: string[] = [];

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

  for (let i = 0; i < poolsLength; i++) {
    const poolsAddressesRes = await call({
      chain,
      target: contract.address,
      params: [i],
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
    const poolsAddresses = poolsAddressesRes.output.stakeToken;
    contractsAddresses.push(poolsAddresses);
  }
  return contractsAddresses;
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

  const contractsAddresses = contractsAddressesRes
    // .filter((res) => res.success)
    .map((res, index) => ({
      associatedWithPoolNumber: index,
      data: res.output
    }))

    console.log(contractsAddresses)

  const contractsInfos = await getERC20Details(chain, contractsAddresses);

  const totalToken = totalTokenRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const totalSupply = totalSupplyRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output))
    .filter((res) => res._hex !== "0x00");

  for (let i = 0; i < contractsInfos.length; i++) {
    const contract = {
      ...contractsInfos[i],
      APY: totalToken[i].div(totalSupply[i]),
    };
    contracts.push(contract);
  }
  return contracts;
}
