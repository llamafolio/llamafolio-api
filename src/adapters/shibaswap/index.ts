import { Adapter } from "@lib/adapter";
import { getERC20BalanceOf } from "@lib/erc20";
import { getPairsInfo } from "@lib/uniswap/v2/factory";
import { getBalances } from "./balances";


const lockerContract: Contract = {
  name: "locker",
  displayName: "Locker",
  chain: "ethereum",
  address: "0xa404f66b9278c4ab8428225014266b4b239bcdc7",
};
const stakerContract: Contract = {
  name: "staker",
  displayName: "Staker tBone",
  chain: "ethereum",
  address: "0xf7a0383750fef5abace57cc4c9ff98e3790202b3",
};

const masterChef: Contract = {
  name: "masterChef",
  displayName: "MasterChef",
  chain: "ethereum",
  address: "0x94235659cf8b805b2c658f9ea2d6d6ddbb17c8d7",
};




const adapter: Adapter = {
  id: "shibaswap",
  async getContracts() {
    return {
      contracts: await getPairsInfo({
        chain: "ethereum",
        factoryAddress: "0x115934131916C8b277DD010Ee02de363c09d037c",
        length: 10
      }),
      revalidate: 60 * 60,
    };
  },
  async getBalances(ctx, contracts) {

    let balances = await getERC20BalanceOf(ctx, "ethereum", contracts);

    const stakeBalances = await getBalances(ctx, "ethereum", [lockerContract, stakerContract, masterChef])
    balances = balances.concat(stakeBalances);

    return {
      balances,
    };
  },
};

export default adapter;
