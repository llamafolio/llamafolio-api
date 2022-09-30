import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Contract, Balance, BaseContext} from "@lib/adapter";
import { ethers } from "ethers";
import abiNXM from "./abi/abi.json"
import { BigNumber } from "ethers";

const poolAddress = "0x84EdfFA16bb0b9Ab1163abb0a13Ff0744c11272f"

export async function getStakeBalances(ctx:BaseContext, chain:Chain) {
  const provider = providers[chain];

  const stakeContracts = new ethers.Contract(
    "0x84EdfFA16bb0b9Ab1163abb0a13Ff0744c11272f",
    abiNXM,
    provider
  );

  const stakeAmount = await stakeContracts.stakerDeposit(ctx.address)
  const claimableAmount = await stakeContracts.stakerReward(ctx.address)

  const stakeBalances = {
    ...NXM,
    amount: BigNumber.from(stakeAmount),
    rewards: [{...NXM, amount: BigNumber.from(claimableAmount)}],
    category: "stake"
  }
  return stakeBalances
}

const NXM: Contract = {
  name: "NXM",
  chain: "ethereum",
  address: "0xd7c49CEE7E9188cCa6AD8FF264C1DA2e69D4Cf3B",
  decimals: 18,
};

const adapter: Adapter = {
  id: "nexus-mutual",
  async getContracts() {
    return {
      contracts: [NXM],

    };
  },
  async getBalances(ctx:BaseContext, contracts) {

    let stakeBalances = await getStakeBalances(ctx, "ethereum");

    let balances = [stakeBalances]

    return {
      balances,
    };
  },
};

export default adapter;
