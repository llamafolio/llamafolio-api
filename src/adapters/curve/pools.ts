import { ethers, BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import {
  getERC20BalanceOf,
  getERC20Details,
  abi as erc20Abi,
} from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Calls, multicall } from "@lib/multicall";
import { ETH_ADDR, Token } from "@lib/token";
import { getBalancesCalls } from "@lib/balance";

const abi = {
  get_address: {
    name: "get_address",
    outputs: [
      {
        type: "address",
        name: "",
      },
    ],
    inputs: [
      {
        type: "uint256",
        name: "_id",
      },
    ],
    stateMutability: "view",
    type: "function",
    gas: 1308,
  },
  pool_count: {
    stateMutability: "view",
    type: "function",
    name: "pool_count",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    gas: 2138,
  },
  pool_list: {
    stateMutability: "view",
    type: "function",
    name: "pool_list",
    inputs: [
      {
        name: "arg0",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    gas: 2217,
  },
  get_pool_name: {
    stateMutability: "view",
    type: "function",
    name: "get_pool_name",
    inputs: [
      {
        name: "_pool",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    gas: 8323,
  },
  get_lp_token: {
    stateMutability: "view",
    type: "function",
    name: "get_lp_token",
    inputs: [
      {
        name: "arg0",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    gas: 2473,
  },
  get_underlying_coins: {
    stateMutability: "view",
    type: "function",
    name: "get_underlying_coins",
    inputs: [
      {
        name: "_pool",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "address[8]",
      },
    ],
    gas: 12194,
  },
  totalSupply: {
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
};

const registryIds = {
  // 0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5
  stableswap: 0,
  stableFactory: 3,
  crypto: 5,
  cryptoFactory: 6,
};

const chains = [
  "ethereum",
  "polygon",
  "arbitrum",
  "aurora",
  "avax",
  "fantom",
  "optimism",
  "xdai",
  "moonbeam",
];

export async function getPoolsContracts() {
  let calls: Calls = Object.values(registryIds).map((r) => ({
    params: [r],
    // address getter
    target: "0x0000000022d53366457f9d5e68ec105046fc4383",
  }));

  const registriesListRes = await multicall({
    chain: "ethereum",
    calls,
    abi: abi.get_address,
  });

  const registriesList = registriesListRes
    .filter((res) => res.success)
    .map((res) => res.output);

  calls = registriesList.map((registryAddress) => ({
    target: registryAddress,
  }));

  const registriesPoolCountRes = await multicall({
    chain: "ethereum",
    calls,
    abi: abi.pool_count,
  });

  const registriesPoolCount = registriesPoolCountRes
    .filter((res) => res.success)
    .map((res) => res.output);

  calls = [];
  // TODO: handle registriesPoolCount[0] (stableswap registry) if call failed above
  for (var i = 0; i < registriesPoolCount[0]; i++) {
    calls.push({
      params: [i],
      target: registriesList[0],
    });
  }

  const mainRegistryPoolsRes = await multicall({
    chain: "ethereum",
    calls,
    abi: abi.pool_list,
  });

  const mainRegistryPoolsList = mainRegistryPoolsRes
    .filter((res) => res.success)
    .map((res) => res.output);

  calls = [];
  for (var i = 0; i < mainRegistryPoolsList.length; i++) {
    calls.push({
      params: [mainRegistryPoolsList[i]],
      target: registriesList[0],
    });
  }

  // Get pools details
  const [mainPoolsDetailsNamesRes, mainPoolLPTokensRes] = await Promise.all([
    multicall({
      chain: "ethereum",
      calls,
      abi: abi.get_pool_name,
    }),

    multicall({
      chain: "ethereum",
      calls,
      abi: abi.get_lp_token,
    }),
  ]);

  // pools without underlyings details
  const basePools = [];

  for (let i = 0; i < mainRegistryPoolsList.length; i++) {
    if (
      !mainPoolsDetailsNamesRes[i].success ||
      !mainPoolLPTokensRes[i].success
    ) {
      console.log("Failed to get pool details", mainRegistryPoolsList[i]);
      continue;
    }

    const poolName = mainPoolsDetailsNamesRes[i].output;
    const lpToken = mainPoolLPTokensRes[i].output;

    basePools.push({
      name: poolName,
      displayName: `${poolName} Curve Pool`,
      chain: "ethereum",
      address: lpToken,
      poolAddress: mainRegistryPoolsList[i],
      underlyings: [],
    });
  }

  // Get underlyings details
  const underlyingCoinsRes = await multicall({
    chain: "ethereum",
    calls: basePools.map((pool) => ({
      target: registriesList[0],
      params: [pool.poolAddress],
    })),
    abi: abi.get_underlying_coins,
  });

  const underlyingCoinsAddresses: string[] = [];
  for (let i = 0; i < underlyingCoinsRes.length; i++) {
    if (underlyingCoinsRes[i].success) {
      for (let address of underlyingCoinsRes[i].output) {
        // response is backfilled with zero address: [address0,address1,0x0,0x0...]
        if (address !== ethers.constants.AddressZero) {
          if (address.toLowerCase() === ETH_ADDR) {
            address = ethers.constants.AddressZero;
          }
          underlyingCoinsAddresses.push(address);
          basePools[i].underlyings?.push(address);
        }
      }
    }
  }

  const underlyingsDetails = await getERC20Details(
    "ethereum",
    underlyingCoinsAddresses
  );

  const underlyingTokenByAddress: { [key: string]: Token } = {};
  for (const token of underlyingsDetails) {
    token.address = token.address.toLowerCase();
    underlyingTokenByAddress[token.address] = token;
  }

  const pools: Contract[] = [];

  for (let i = 0; i < basePools.length; i++) {
    const basePool = basePools[i];

    // map addresses to their tokens
    const underlyingsTokens = basePool.underlyings.map(
      (address: string) => underlyingTokenByAddress[address.toLowerCase()]
    );

    if (underlyingsTokens.length < basePool.underlyings.length) {
      console.error("Failed to get underlyings tokens of pool", basePool);
      continue;
    }

    const pool: Contract = {
      ...basePool,
      underlyings: underlyingsTokens,
    };
    pools.push(pool);
  }

  return pools;
}

export async function getPoolsBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  const nonEmptyPools = (await getERC20BalanceOf(ctx, chain, contracts)).filter(
    (pool) => pool.amount.gt(0)
  );

  const totalSupplyRes = await multicall({
    chain,
    calls: nonEmptyPools.map((contract) => ({
      target: contract.address,
    })),
    abi: abi.totalSupply,
  });

  // collect underlyings and get their balances
  let calls: Calls = [];
  for (let i = 0; i < nonEmptyPools.length; i++) {
    const pool = nonEmptyPools[i];
    if (pool.underlyings) {
      for (let j = 0; j < pool.underlyings.length; j++) {
        const underlying = pool.underlyings[j];
        calls.push({
          params: [pool.poolAddress],
          target: underlying.address,
        });
      }
    }
  }

  const underlyingsBalances = await getBalancesCalls(chain, calls);

  // map back underlying amounts to their pools
  for (let i = 0; i < underlyingsBalances.length; i++) {
    if (underlyingsBalances[i].success) {
      const poolAddress = underlyingsBalances[i].input.params[0];
      const underlyingAddress =
        underlyingsBalances[i].input.target.toLowerCase();

      const pool = nonEmptyPools.find(
        (pool) => pool.poolAddress === poolAddress
      );

      if (pool) {
        const underlying = pool.underlyings?.find(
          (underlying: Contract) =>
            underlying.address.toLowerCase() === underlyingAddress
        );

        if (underlying) {
          underlying.amount = BigNumber.from(underlyingsBalances[i].output);
        }
      }
    }
  }

  // update underlying amounts with LP supply ratio
  for (let i = 0; i < nonEmptyPools.length; i++) {
    if (
      totalSupplyRes[i].success &&
      nonEmptyPools[i].underlyings?.length > 0 &&
      nonEmptyPools[i].underlyings.every((underlying) =>
        underlying.amount?.gt(0)
      )
    ) {
      const totalSupply = BigNumber.from(totalSupplyRes[i].output);

      for (const underlying of nonEmptyPools[i].underlyings) {
        underlying.amount = nonEmptyPools[i].amount
          .mul(underlying.amount)
          .div(totalSupply);
      }

      balances.push({ ...nonEmptyPools[i], category: "lp" });
    }
  }

  return balances;
}
