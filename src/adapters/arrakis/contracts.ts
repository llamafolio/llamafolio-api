import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";

import FactoryAbi from "./abis/Factory.json";

export async function getVaults(factoryArrakis) {
  const provider = providers[factoryArrakis.chain];
  const contract = new ethers.Contract(
    factoryArrakis.address,
    FactoryAbi,
    provider
  );

  const allMainPools = await contract.getGelatoPools();

  const formattedPools = allMainPools.map((address, i) => ({
    name: "pool",
    displayName: `Arrakis Pool`,
    chain: "ethereum",
    address: address,
  }));

  const deployers = await contract.getDeployers();

  let calls = deployers.map((deployer) => {
    return {
      params: [deployer],
      target: factoryArrakis.address,
    };
  });

  const getAllPoolsRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
      inputs: [
        {
          internalType: "address",
          name: "deployer",
          type: "address",
        },
      ],
      name: "getPools",
      outputs: [
        {
          internalType: "address[]",
          name: "",
          type: "address[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const getAllPools = getAllPoolsRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const customPoolsFetch = [];
  for (let index = 0; index < getAllPools.length; index++) {
    const pools = getAllPools[index];
    for (let i = 0; i < pools.length; i++) {
      customPoolsFetch.push(pools[i]);
    }
  }

  const customPools = customPoolsFetch.map((address, i) => ({
    name: "pool",
    displayName: `Arrakis Pool`,
    chain: "ethereum",
    address: address,
  }));

  return formattedPools.concat(customPools);
}
