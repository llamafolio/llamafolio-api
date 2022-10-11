import { Chain } from "@defillama/sdk/build/general";
import { BaseContext } from "@lib/adapter";
import { BigNumber } from "ethers";
import { Contract, Balance } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";

const usdcToken = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";
const pool = [
  "0x1a731b2299e22fbac282e7094eda41046343cb51", // sJOE stake
  "0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341", // veJOE stake
  "0x102D195C3eE8BF8A9A89d63FB3659432d3174d81", // rJOE stake
];

export async function getStakeBalance(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract
) {
  let balances: Balance[] = [];

  const [sJOEbalanceOfRes, veJOEbalanceOfRes, rJOEbalanceOfRes] =
    await Promise.all([
      call({
        chain,
        target: pool[0],
        params: [ctx.address, usdcToken],
        abi: {
          inputs: [
            { internalType: "address", name: "_user", type: "address" },
            {
              internalType: "contract IERC20Upgradeable",
              name: "_rewardToken",
              type: "address",
            },
          ],
          name: "getUserInfo",
          outputs: [
            { internalType: "uint256", name: "", type: "uint256" },
            { internalType: "uint256", name: "", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: pool[1],
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "userInfos",
          outputs: [
            { internalType: "uint256", name: "balance", type: "uint256" },
            { internalType: "uint256", name: "rewardDebt", type: "uint256" },
            {
              internalType: "uint256",
              name: "lastClaimTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "speedUpEndTimestamp",
              type: "uint256",
            },
          ],
          stateMutability: "view",
          type: "function",
        },
      }),

      call({
        chain,
        target: pool[2],
        params: [ctx.address],
        abi: {
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "userInfo",
          outputs: [
            { internalType: "uint256", name: "amount", type: "uint256" },
            { internalType: "uint256", name: "rewardDebt", type: "uint256" },
          ],
          stateMutability: "view",
          type: "function",
        },
      }),
    ]);

  const sJOEbalanceOf = BigNumber.from(sJOEbalanceOfRes.output[0]);
  const veJOEbalanceOf = BigNumber.from(veJOEbalanceOfRes.output.balance);
  const rJOEbalanceOf = BigNumber.from(rJOEbalanceOfRes.output.amount);

  const stakeAmount = [sJOEbalanceOf, veJOEbalanceOf, rJOEbalanceOf];

  const [sJOErewardsRes, veJOErewardsRes, rJOErewardsRes] = await Promise.all([
    call({
      chain,
      target: pool[0],
      params: [ctx.address, usdcToken],
      abi: {
        inputs: [
          { internalType: "address", name: "_user", type: "address" },
          {
            internalType: "contract IERC20Upgradeable",
            name: "_token",
            type: "address",
          },
        ],
        name: "pendingReward",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: pool[1],
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "getPendingVeJoe",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: pool[2],
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "_user", type: "address" }],
        name: "pendingRJoe",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const sJOErewards = BigNumber.from(sJOErewardsRes.output);
  const veJOErewards = BigNumber.from(veJOErewardsRes.output);
  const rJOErewards = BigNumber.from(rJOErewardsRes.output);

  const rewardsAmount = [sJOErewards, veJOErewards, rJOErewards];

  for (let i = 0; i < pool.length; i++) {
    const balance = {
      ...contracts,
      address: pool[i],
      amount: stakeAmount[i],
      rewards: [{ ...contracts.rewards[i], amount: rewardsAmount[i] }],
      category: "stake",
    };
    balances.push(balance);
  }
  return balances;
}
