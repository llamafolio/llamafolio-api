import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance } from "@lib/adapter";
import { BaseContext } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers/lib/ethers";

const USV_ETH: Contract = {
  name: "Universal Store of Value",
  chain: "ethereum",
  address: "0x88536C9B2C4701b8dB824e6A16829D5B5Eb84440",
  symbol: "USV",
  decimals: 9,
};

const USV_POLYGON: Contract = {
  name: "Universal Store of Value",
  chain: "polygon",
  address: "0xac63686230f64bdeaf086fe6764085453ab3023f",
  symbol: "USV",
  decimals: 9,
};

const USV_AVAX: Contract = {
  name: "Universal Store of Value",
  chain: "avax",
  address: "0xb0a8E082E5f8d2a04e74372c1bE47737d85A0E73",
  symbol: "USV",
  decimals: 9,
};

const USV_BSC: Contract = {
  name: "Universal Store of Value",
  chain: "bsc",
  address: "0xaf6162DC717CFC8818eFC8d6f46a41Cf7042fCBA",
  symbol: "USV",
  decimals: 9,
};

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract: Contract
) {
  const balances: Balance[] = [];
  const underlyings: Contract[] = [USV_ETH, USV_POLYGON, USV_AVAX, USV_BSC];

  const balanceOfRes = await call({
    chain,
    target: contract.address,
    params: [ctx.address],
    abi: abi.balanceOf,
  });

  const amount = BigNumber.from(balanceOfRes.output);

  const underlyingToken = underlyings
    .filter((token) => token.chain === chain)
    .map((token) => (token.amount = { ...token, amount }));

  const balance: Balance = {
    chain,
    address: contract.address,
    decimals: contract.decimals,
    symbol: contract.symbol,
    amount,
    underlyings: underlyingToken,
    category: "stake",
  };
  balances.push(balance);

  return balances;
}
