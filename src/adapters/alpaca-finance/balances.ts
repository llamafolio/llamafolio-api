// import { multicall } from "@lib/multicall";
// import { Balance, Contract, BaseContext } from "@lib/adapter";
// import { Chain } from "@defillama/sdk/build/general";
// import { getPoolsContracts, getContractsInfos } from "./pool";
// import { call } from "@defillama/sdk/build/abi";

// const FairLaunch: Contract = {
//   name: "fairlaunchContractAddress",
//   chain: "bsc",
//   address: "0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F",
// };

// export async function getFarmBalances(
//   ctx: BaseContext,
//   chain: Chain,
//   contracts: Contract[]
// ) {
//   const userBalance = [];
//   const balances: Balance[] = [];
//   const pool = await getPoolsContracts(chain, FairLaunch);

//   for (let i = 0; i < pool.length; i++) {
//     const calls = [
//       {
//         target: FairLaunch.address,
//         params: [i, ctx.address],
//       },
//     ];

//     const [userInfoRes, pendingRewardsRes] = await Promise.all([
//       multicall({
//         chain,
//         calls,
//         abi: {
//           inputs: [
//             { internalType: "uint256", name: "", type: "uint256" },
//             { internalType: "address", name: "", type: "address" },
//           ],
//           name: "userInfo",
//           outputs: [
//             { internalType: "uint256", name: "amount", type: "uint256" },
//             { internalType: "uint256", name: "rewardDebt", type: "uint256" },
//             { internalType: "uint256", name: "bonusDebt", type: "uint256" },
//             { internalType: "address", name: "fundedBy", type: "address" },
//           ],
//           stateMutability: "view",
//           type: "function",
//         },
//       }),
//       multicall({
//         chain,
//         calls,
//         abi: {
//           inputs: [
//             { internalType: "uint256", name: "_pid", type: "uint256" },
//             { internalType: "address", name: "_user", type: "address" },
//           ],
//           name: "pendingAlpaca",
//           outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//           stateMutability: "view",
//           type: "function",
//         },
//       }),
//     ]);

//     const userInfo = userInfoRes
//       .filter((res) => res.success)
//       .map((res) => res.output);
  
//     const pendingRewards = pendingRewardsRes
//       .filter((res) => res.success)
//       .map((res) => res.output);
//   }


//     userBalance.push({ userInfo, pendingRewards });

//     console.log(userBalance);
//   }
// }
