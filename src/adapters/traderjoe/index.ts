import { Adapter } from "@lib/adapter";
import {
  getMarketsBalances,
  getMarketsContracts,
} from "@lib/compound/v2/lending";
import { Contract } from "@lib/adapter";
import { getStakeBalance } from "./balances";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

interface ContractProps extends Contract {
  types: string | undefined
}

const sJOE: ContractProps = {
  name: "sJOE staking",
  chain: "avax",
  address: "0x1a731b2299e22fbac282e7094eda41046343cb51",
  types: "stake"
};
const veJOE: ContractProps = {
  name: "veJOE staking",
  chain: "avax",
  address: "0x25D85E17dD9e544F6E9F8D44F99602dbF5a97341",
  types: "stake"
};
const rJOE: ContractProps = {
  name: "rJOE staking",
  chain: "avax",
  address: "0x102D195C3eE8BF8A9A89d63FB3659432d3174d81",
  types: "stake"
};

const adapter: Adapter = {
  id: "trader-joe",
  async getContracts() {

    const markets = await getMarketsContracts("avax", {
      comptrollerAddress: "0xdc13687554205E5b89Ac783db14bb5bba4A1eDaC",
    })

    const poolsMarkets: ContractProps[] = markets.map((contract) => {
      return {
        ...contract,
        types: "market"
      }
    })

    const pairs = await getPairsContracts({
      chain: "avax",
      factoryAddress: "0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10",
      length: 100
    })

    const uniPool: ContractProps[] = pairs.map((contract) => {
      return {
        ...contract,
        types: "pair"
      }
    })

    return {
      contracts: [...poolsMarkets, ...uniPool, sJOE, veJOE, rJOE],
      revalidate: 60 * 60,
    };
  },

  async getBalances(ctx, contracts: ContractProps) {

    const marketsPool = contracts.filter((contract:ContractProps) => contract.types === "market")
    const marketsBalances = await getMarketsBalances(ctx, "avax", marketsPool);

    const uniPool = contracts.filter((contract:ContractProps) => contract.types === "pairs")
    const pairsBalances = await getPairsBalances(ctx, "avax", uniPool);

    const stakeBalances = await getStakeBalance(ctx, "avax");

    const balances = [...marketsBalances, ...stakeBalances, ...pairsBalances]

    return {
      balances,
    };
  },
};

export default adapter;

