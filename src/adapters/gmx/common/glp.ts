import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20Details } from "@lib/erc20";

export async function getGLPContracts(chain: Chain, contract?: Contract) {
  const glpStaker: Contract[] = [];

  if (!contract) {
    console.log("Missing or incorrect contract");

    return [];
  }

  try {
    const [stakerGLPTrackerRes, glpRes, wethRes, stakerGLPFeesRes, esGmxRes] =
      await Promise.all([
        call({
          chain,
          target: contract.address,
          params: [],
          abi: {
            inputs: [],
            name: "stakedGlpTracker",
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
            name: "glp",
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
            name: "feeGlpTracker",
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
      ]);

    const [stakerGLPTracker, glp, weth, stakerGLPFees, esGmx] =
      await Promise.all([
        getERC20Details(chain, [stakerGLPTrackerRes.output]),
        getERC20Details(chain, [glpRes.output]),
        getERC20Details(chain, [wethRes.output]),
        getERC20Details(chain, [stakerGLPFeesRes.output]),
        getERC20Details(chain, [esGmxRes.output]),
      ]);

    glpStaker.push({
      chain,
      decimals: stakerGLPTracker[0].decimals,
      symbol: stakerGLPTracker[0].symbol,
      address: stakerGLPTracker[0].address,
      underlyings: [stakerGLPFees[0], glp[0]],
      rewards: [esGmx[0], weth[0]],
    });

    return glpStaker;
  } catch (error) {
    console.log("Failed to get underlyied glp contract");

    return [];
  }
}

export async function getGLPBalances(
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
    const fGlp = contract.underlyings?.[0];
    const glp = contract.underlyings?.[1];
    const esGMX = contract.rewards?.[0];
    const native = contract.rewards?.[1];

    const [stakeGLPRes, pendingesGMXRewardsRes, pendingETHRewardsRes] =
      await Promise.all([
        call({
          chain,
          target: contract.address,
          params: [ctx.address],
          abi: {
            inputs: [{ internalType: "address", name: "", type: "address" }],
            name: "stakedAmounts",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
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
          target: fGlp.address,
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

    const stakeGLP = BigNumber.from(stakeGLPRes.output);
    const pendingesGMXRewards = BigNumber.from(pendingesGMXRewardsRes.output);
    const pendingETHRewards = BigNumber.from(pendingETHRewardsRes.output);

    balances.push({
      chain,
      category: "stake",
      address: contract.address,
      symbol: contract.symbol,
      decimals: contract.decimals,
      amount: stakeGLP,
      underlyings: [{ ...glp, amount: stakeGLP }],
      rewards: [
        { ...esGMX, amount: pendingesGMXRewards },
        { ...native, amount: pendingETHRewards },
      ],
    });

    return balances;
  } catch (error) {
    console.log("Failed to get glp balance");

    return [];
  }
}
