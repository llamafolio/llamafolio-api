import { Chain } from "@defillama/sdk/build/general";
import { Adapter, Balance, BaseContext, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";

const rewardAddress = "0x2FC93484614a34f26F7970CBB94615bA109BB4bf"
const balancesAddress = "0x5efda50f22d34F262c29268506C5Fa42cB56A1Ce";

const getBalances = async (ctx: BaseContext, chain: Chain, contracts:any) => {
  const [balanceOf, rewards] = await Promise.all([
    call({
      chain,
      target: balancesAddress,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "lockedBalance",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
    call({
      chain,
      target: rewardAddress,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "checkReward",
        outputs: [
          { internalType: "uint256", name: "rewards", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const stakeAmount = BigNumber.from(balanceOf.output)
  const rewardAmount = BigNumber.from(rewards.output)

  const balances:Balance = {
    ...contracts[0],
    amount: stakeAmount,
    rewards: [{...contracts[0], amount: rewardAmount}],
    category: "stake"
  }
  return balances
};

const TORN: Contract = {
  name: "TornadoCash",
  chain: "ethereum",
  address: "0x77777feddddffc19ff86db637967013e6c6a116c",
  symbol: "TORN",
};

const adapter: Adapter = {
  id: "tornado-cash",
  async getContracts() {
    return {
      contracts: [TORN],
    };
  },
  async getBalances(ctx:BaseContext, contracts) {
    const lendBalances = await getBalances(ctx, "ethereum", contracts);
    let balances = [lendBalances]

    return {
      balances,
    };
  },
};

export default adapter;
