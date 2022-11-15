import { BigNumber } from "ethers";
import { ethers } from "ethers";
import { providers } from "@lib/providers";
import { Adapter, Balance, Contract, GetBalancesHandler } from "@lib/adapter";
import abi from "./abi/hex.json";
import { multicall } from "@lib/multicall";
import { range } from "@lib/array";
import { sumBN } from "@lib/math";
import { Chain } from "@lib/chains";

const HEX: Contract = {
  name: "HEX",
  chain: "ethereum",
  address: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  decimals: 8,
  symbol: "HEX",
};

const getStakeBalances = async (ctx: any, chain: Chain) => {
  let stakeCount: number = 0;
  const provider = providers[chain];
  const stakeContracts = new ethers.Contract(HEX.address, abi, provider);
  stakeCount = await stakeContracts.stakeCount(ctx.address);

  const stakeListsRes = await multicall({
    chain: HEX.chain,
    calls: range(0, stakeCount).map((i) => ({
      target: HEX.address,
      params: [ctx.address, i],
    })),
    abi: {
      constant: true,
      inputs: [
        { internalType: "address", name: "", type: "address" },
        { internalType: "uint256", name: "", type: "uint256" },
      ],
      name: "stakeLists",
      outputs: [
        { internalType: "uint40", name: "stakeId", type: "uint40" },
        { internalType: "uint72", name: "stakedHearts", type: "uint72" },
        { internalType: "uint72", name: "stakeShares", type: "uint72" },
        { internalType: "uint16", name: "lockedDay", type: "uint16" },
        { internalType: "uint16", name: "stakedDays", type: "uint16" },
        { internalType: "uint16", name: "unlockedDay", type: "uint16" },
        { internalType: "bool", name: "isAutoStake", type: "bool" },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const stakeAmount = sumBN(
    stakeListsRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output.stakedHearts))
  );

  const stakeBalance: Balance = {
    ...HEX,
    amount: stakeAmount,
    category: "stake",
  };

  return [stakeBalance];
};

const getContracts = () => {
  return {
    contracts: { HEX },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { HEX }
) => {
  if (HEX) {
    return {
      balances: await getStakeBalances(ctx, "ethereum"),
    };
  }

  return {
    balances: [],
  };
};

const adapter: Adapter = {
  id: "hex",
  getContracts,
  getBalances,
};

export default adapter;
