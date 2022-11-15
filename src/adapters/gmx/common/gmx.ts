import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { abi, getERC20Details } from "@lib/erc20";

export async function getGMXContracts(chain: Chain, contract?: Contract) {
  const gmxStaker: Contract[] = [];

  if (!contract) {
    console.log("Missing or incorrect contract");

    return [];
  }

  try {
    const [
      stakerGmxTrackerRes,
      gmxRes,
      wethRes,
      stakerGmxFeesRes,
      esGmxRes,
      gmxVesterRes,
    ] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "stakedGmxTracker",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "gmx",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "weth",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "feeGmxTracker",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "esGmx",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: contract.address,
        params: [],
        abi: {
          inputs: [],
          name: "gmxVester",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const [stakerGmxTracker, gmx, weth, stakerGmxFees, esGmx, gmxVester] =
      await Promise.all([
        getERC20Details(chain, [stakerGmxTrackerRes.output]),
        getERC20Details(chain, [gmxRes.output]),
        getERC20Details(chain, [wethRes.output]),
        getERC20Details(chain, [stakerGmxFeesRes.output]),
        getERC20Details(chain, [esGmxRes.output]),
        getERC20Details(chain, [gmxVesterRes.output]),
      ]);

    gmxStaker.push({
      chain,
      decimals: stakerGmxTracker[0].decimals,
      symbol: stakerGmxTracker[0].symbol,
      address: stakerGmxTracker[0].address,
      gmxVester: gmxVester[0],
      underlyings: [stakerGmxFees[0], gmx[0]],
      rewards: [esGmx[0], weth[0]],
    });

    return gmxStaker;
  } catch (error) {
    console.log("Failed to get underlyied gmx contract");

    return [];
  }
}

export async function getGMXBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const contract = contracts[0];
  const balances: Balance[] = [];

  if (!contract || !contract.underlyings || !contract.rewards) {
    console.log("Missing or incorrect contract");

    return [];
  }

  try {
    const sbfGMX = contract.underlyings?.[0];
    const gmx = contract.underlyings?.[1];
    const esGMX = contract.rewards?.[0];
    const native = contract.rewards?.[1];

    const [
      stakeGMXRes,
      stakeEsGMXRes,
      pendingesGMXRewardsRes,
      pendingETHRewardsRes,
    ] = await Promise.all([
      call({
        chain,
        target: contract.address,
        params: [ctx.address, gmx.address],
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "depositBalances",
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
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address, esGMX.address],
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "",
              type: "address",
            },
            {
              internalType: "address",
              name: "",
              type: "address",
            },
          ],
          name: "depositBalances",
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
      }),

      call({
        chain,
        target: contract.address,
        params: [ctx.address],
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "_account",
              type: "address",
            },
          ],
          name: "claimable",
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
      }),

      call({
        chain,
        target: sbfGMX.address,
        params: [ctx.address],
        abi: {
          inputs: [
            {
              internalType: "address",
              name: "_account",
              type: "address",
            },
          ],
          name: "claimable",
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
      }),
    ]);

    const stakeGMX = BigNumber.from(stakeGMXRes.output);
    const stakeEsGMX = BigNumber.from(stakeEsGMXRes.output);
    const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output);
    const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output);

    const gmxBalance: Balance = {
      chain,
      category: "stake",
      address: contract.address,
      symbol: contract.symbol,
      decimals: contract.decimals,
      amount: stakeGMX,
      underlyings: [{ ...gmx, amount: stakeGMX }],
      rewards: [
        { ...esGMX, amount: pendingesGMXRewards },
        { ...native, amount: pendingETHRewards },
      ],
    };

    const esGmxBalance: Balance = {
      chain,
      category: "stake",
      address: esGMX.address,
      symbol: esGMX.symbol,
      decimals: esGMX.decimals,
      amount: stakeEsGMX,
      underlyings: [{ ...gmx, amount: stakeEsGMX }],
    };

    balances.push(gmxBalance, esGmxBalance);

    return balances;
  } catch (error) {
    console.log("Failed to get gmx balance");
    return [];
  }
}

export async function getGMXVesterBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const contract = contracts[0];
  const balances: Balance[] = [];

  if (!contract || !contract.underlyings || !contract.rewards) {
    console.log("Missing or incorrect contract");

    return [];
  }
  try {
    const gmxVester = contract.gmxVester;
    const gmx = contract.underlyings[1];

    const [balanceOfRes, claimableRes] = await Promise.all([
      call({
        chain,
        target: gmxVester.address,
        params: [ctx.address],
        abi: abi.balanceOf,
      }),

      call({
        chain,
        target: gmxVester.address,
        params: [ctx.address],
        abi: {
          inputs: [
            { internalType: "address", name: "_account", type: "address" },
          ],
          name: "claimable",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

    const balanceOf = BigNumber.from(balanceOfRes.output);
    const claimable = BigNumber.from(claimableRes.output);

    balances.push({
      chain,
      category: "vest",
      address: gmxVester.address,
      symbol: gmxVester.symbol,
      decimals: gmxVester.decimals,
      amount: balanceOf,
      underlyings: [{ ...gmx, amount: balanceOf }],
      rewards: [{ ...gmx, amount: claimable }],
    });

    return balances;
  } catch (error) {
    console.log("Failed to get vester balance");

    return [];
  }
}
