import { Chain } from "@defillama/sdk/build/general";
import { Adapter } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { multicall } from "@lib/multicall";
import { Token } from "@lib/token";
import { ChainableTemporaryCredentials } from "aws-sdk";
import { BigNumber } from "ethers";

const lendingPool = [
  // "0x1Ed460D149D48FA7d91703bf4890F97220C09437", // Truefi BUSD pool
  "0xA991356d261fbaF194463aF6DF8f0464F8f1c742", // Truefi USDC pool
  "0x6002b1dcB26E7B1AA797A17551C6F487923299d7", // Truefi USDT pool
  "0x97cE06c3e3D027715b2d6C22e67D5096000072E5", // Truefi TUSD pool
  "0xa1e72267084192Db7387c8CC1328fadE470e4149", // Legacy TUSD pool
];

const farmingAddress = "0xec6c3FD795D6e6f202825Ddb56E01b3c128b0b10"; // Liquidity Gauche multifarm

const truefiAddress = "0x4c19596f5aaff459fa38b0f7ed92f11ae6543784" // Rewards farming : TRU

const getStakeInfosStatic = async (
  chain: Chain,
  tokens: string[]
): Promise<Token> => {
  const stakeInfos = [];
  const calls = tokens.map((address) => ({
    target: address,
    params: [],
  }));

  const [symbol, decimals, underlyings] = await Promise.all([
    multicall({ chain, calls, abi: abi.symbol }),
    multicall({ chain, calls, abi: abi.decimals }),
    multicall({
      chain,
      calls,
      abi: {
        inputs: [],
        name: "token",
        outputs: [
          { internalType: "contract ERC20", name: "", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const details = {
      chain,
      address: tokens[i],
      symbol: symbol[i].output,
      decimals: decimals[i].output,
      underlying: underlyings[i].output.toLowerCase(),
    };
    stakeInfos.push(details);
  }
  return stakeInfos;
};

const adapter: Adapter = {
  id: "truefi",
  async getContracts() {
    const stakeTRU = await getStakeInfosStatic("ethereum", lendingPool);
    return {
      contracts: stakeTRU,
    };
  },

  async getBalances(ctx, contracts) {
    const getStakeInfosDynamics = async (
      ctx: string,
      chain: Chain,
      tokens: string[]
    ) => {
      const stakeInfos = [];

      const calls = tokens.map((address) => ({
        target: address,
        params: [],
      }));

      const balance = tokens.map((address) => ({
        target: address,
        params: [ctx],
      }));

      const [poolValue, totalSupply, balanceOf] = await Promise.all([
        multicall({
          chain,
          calls,
          abi: {
            inputs: [],
            name: "poolValue",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),
        multicall({
          chain,
          calls,
          abi: {
            inputs: [],
            name: "totalSupply",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),
        multicall({
          chain,
          calls: balance,
          abi: abi.balanceOf,
        }),
      ]);

      for (let i = 0; i < tokens.length; i++) {
        const details = {
          ...contracts[i],
          poolValue: BigNumber.from(poolValue[i].output),
          totalSupply: BigNumber.from(totalSupply[i].output),
          amount: BigNumber.from(balanceOf[i].output),
        };
        stakeInfos.push(details);
      }

      return stakeInfos;
    };

    const getlendingBalances = async (ctx: any) => {
      const lendingBalances = (
        await getStakeInfosDynamics(ctx.address, "ethereum", lendingPool)
      ).map((item) => {
        return {
          ...item,
          address: item.underlying,
          parent: item.address,
          amount: item.amount.mul(item.poolValue).div(item.totalSupply),
          category: "stake",
        };
      });
      return lendingBalances;
    };

    const getFarmingInfos = async (
      ctx: string,
      chain: Chain,
      tokens: string[]
    ) => {
      let farmingInfos = [];
      const contractsInfos = await getStakeInfosDynamics(
        ctx.address,
        "ethereum",
        lendingPool
      );

      const calls = tokens.map((address) => ({
        target: farmingAddress,
        params: [address, ctx.address],
      }));

      const [claimable, staked] = await Promise.all([
        multicall({
          chain,
          calls,
          abi: {
            inputs: [
              {
                internalType: "contract IERC20",
                name: "token",
                type: "address",
              },
              { internalType: "address", name: "account", type: "address" },
            ],
            name: "claimable",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),
        multicall({
          chain,
          calls,
          abi: {
            inputs: [
              {
                internalType: "contract IERC20",
                name: "token",
                type: "address",
              },
              { internalType: "address", name: "staker", type: "address" },
            ],
            name: "staked",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),
      ]);
      for (let i = 0; i < tokens.length; i++) {
        const details = {
          ...contractsInfos[i],
          amount: BigNumber.from(staked[i].output),
          claimable: BigNumber.from(claimable[i].output),
        }
        farmingInfos.push(details)
      }
      return farmingInfos
    };

    const getFarmingBalances = async (ctx:any) => {
      const farmingBalances = 
        (await getFarmingInfos(ctx, "ethereum", lendingPool)).map((item) => {
          return {
            ...item,
            address: item.underlying,
            parent: farmingAddress,
            rewards: [item.claimable],
            amount: (item.amount.mul(item.poolValue).div(item.totalSupply)),
            category: "farm"
          }
        })
        return farmingBalances
    }

    let farmingBalances = await getFarmingBalances(ctx)


    let lendingBalances = await getlendingBalances(ctx);
    
    let balances = [...farmingBalances, ...lendingBalances]
    console.log(balances)

    return {
      balances,
    };
  },
};

export default adapter;
