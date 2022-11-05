import { BigNumber } from "ethers";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Balance, Contract } from "@lib/adapter";
import { abi } from "@lib/erc20";
import { call } from "@defillama/sdk/build/abi";

export async function getWStEthStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }

  const balances: Balance[] = [];

  try {
    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    });

    const converterWStEthToStEthRes = await call({
      chain: "ethereum",
      target: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
      params: [balanceOfRes.output],
      abi: {
        inputs: [
          { internalType: "uint256", name: "_wstETHAmount", type: "uint256" },
        ],
        name: "getStETHByWstETH",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    });

    const formattedBalanceOf = BigNumber.from(converterWStEthToStEthRes.output);

    const balance: Balance = {
      chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: formattedBalanceOf,
      underlyings: [
        { ...contract.underlyings?.[0], amount: formattedBalanceOf },
      ],
      category: "stake",
    };

    balances.push(balance);

    return balances;
  } catch (error) {
    return [];
  }
}

export async function getStEthStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  const balances: Balance[] = [];

  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }

  try {
    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    });

    const balanceOf = BigNumber.from(balanceOfRes.output);

    const balance: Balance = {
      chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: balanceOf,
      underlyings: [{ ...contract.underlyings?.[0], amount: balanceOf }],
      category: "stake",
    };

    balances.push(balance);

    return balances;
  } catch (error) {
    return [];
  }
}

export async function getStMaticBalances(
  ctx: BaseContext,
  chain: Chain,
  contract?: Contract
) {
  if (!contract || !contract.underlyings?.[0]) {
    return [];
  }

  const balances: Balance[] = [];

  try {
    const balanceOfRes = await call({
      chain,
      target: contract.address,
      params: [ctx.address],
      abi: abi.balanceOf,
    });

    const converterWStEthToStEthRes = await call({
      chain,
      target: contract.address,
      params: [balanceOfRes.output],
      abi: {
        inputs: [
          { internalType: "uint256", name: "_balance", type: "uint256" },
        ],
        name: "convertStMaticToMatic",
        outputs: [
          { internalType: "uint256", name: "", type: "uint256" },
          { internalType: "uint256", name: "", type: "uint256" },
          { internalType: "uint256", name: "", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const formattedBalanceOf = BigNumber.from(
      converterWStEthToStEthRes.output[0]
    );

    const balance: Balance = {
      chain,
      decimals: contract.decimals,
      symbol: contract.symbol,
      address: contract.address,
      amount: formattedBalanceOf,
      underlyings: [
        { ...contract.underlyings?.[0], amount: formattedBalanceOf },
      ],
      category: "stake",
    };

    balances.push(balance);

    return balances;
  } catch (error) {
    return [];
  }
}
