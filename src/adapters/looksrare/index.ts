import { Chain } from "@defillama/sdk/build/general";
import { Adapter, BaseContext, Contract } from "@lib/adapter";
import { BigNumber } from "ethers";
import { call } from "@defillama/sdk/build/abi";

const stakingContract = "0xbcd7254a1d759efa08ec7c3291b2e85c5dcc12ce";
const compoundContract = "0x3ab16af1315dc6c95f83cbf522fecf98d00fd9ba";

const getStakedBalances = async (ctx: BaseContext, chain: Chain) => {
  const balance:any[] = []
  const [rewardsBalanceRes, stakeBalanceOfRes, yieldBalancesOfRes] = await Promise.all([
    call({
      chain,
      target: stakingContract,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "calculatePendingRewards",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: stakingContract,
      params: ctx.address,
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "calculateSharesValueInLOOKS",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    }),
    
    call({
      chain,
      target: compoundContract,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "calculateSharesValueInLOOKS",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    })
  ]);

  const stakeBalanceOf = BigNumber.from(stakeBalanceOfRes.output);
  const rewardsBalance = BigNumber.from(rewardsBalanceRes.output);
  const yieldBalanceOf = BigNumber.from(yieldBalancesOfRes.output); 

  const stakebalance = {
    ...LooksRare,
    amount: stakeBalanceOf,
    rewards: [{ ...underlyings, amount: rewardsBalance }],
    category: "stake",
  };
  balance.push(stakebalance)

  const yieldBalance = {
    ...LooksRare,
    amount: yieldBalanceOf,
    yieldsAddress: compoundContract,
    category: "yield"
  }
  balance.push(yieldBalance)

  return balance;
};

const underlyings: Contract = {
  name: "Wrapped Ether",
  chain: "ethereum",
  address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  decimals: 18,
  symbols: "WETH",
};

const LooksRare: Contract = {
  name: "LooksRare Token",
  chain: "ethereum",
  address: "0xf4d2888d29D722226FafA5d9B24F9164c092421E",
  decimals: 18,
  symbols: "LOOKS",
};

const adapter: Adapter = {
  id: "looksrare",
  async getContracts() {
    return {
      contracts: [],
    };
  },
  async getBalances(ctx) {
    let balances = await getStakedBalances(ctx, "ethereum");;

    return {
      balances,
    };
  },
};

export default adapter;
