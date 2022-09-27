import { Chain, providers } from "@defillama/sdk/build/general";
import { Adapter, Contract } from "@lib/adapter";
import { ethers } from "ethers";
import abi from "./abi/hex.json";
import { BigNumber } from "ethers";

const stake_hex: Contract = {
  name: "HEX",
  chain: "ethereum",
  address: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
  decimals: 8,
  symbol: "HEX",
};

const getStakeContracts = async (ctx: any, chain: Chain) => {
  const balances = []
  let stakeCount: number = 0;
  const provider = providers[chain];
  const stakeContracts = new ethers.Contract(stake_hex.address, abi, provider);
  stakeCount = await stakeContracts.stakeCount(ctx.address);
  
  for (let i = 0; i < stakeCount; i++ ) {
    const balanceOf = await stakeContracts.stakeLists(ctx.address, i)
    balances.push(balanceOf.stakedHearts)
  }

  const stakeBalances = balances.reduce((acc, num) => BigNumber.from(acc).add(num))

  return stakeBalances
};


const adapter: Adapter = {
  id: "hex",
  async getContracts() {
    return {
      contracts: stake_hex,
    };
  },

  async getBalances(ctx, contracts) {

    const stakebBalances = [{
      ...contracts,
      amount: await getStakeContracts(ctx, "ethereum"),
      category: "stake"
    }]

    let balances = stakebBalances

    return {
      balances,
    };
  },
};

export default adapter;
