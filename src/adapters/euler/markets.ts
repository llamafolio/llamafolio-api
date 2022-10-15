import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import EulerAbi from "./abis/Markets.json";
import LensAbi from "./abis/Lens.json";
import ETokenAbi from "./abis/eToken.json";
import { Balance } from "@lib/adapter";

export async function getPositions(ctx, chain, contracts): Promise<Balance[]> {
  const provider = providers[chain];
  const marketEuler = new ethers.Contract(
    contracts[0].address,
    EulerAbi,
    provider
  );

  const marketsEntered = await marketEuler.getEnteredMarkets(ctx.address);

  const marketsRaw = await getERC20Details(chain, marketsEntered);

  let callsLend = [];
  let callsBorrow = [];

  for (let index = 0; index < marketsEntered.length; index++) {
    callsLend.push({
      params: [marketsEntered[index]],
      target: marketEuler.address,
    });

    callsBorrow.push({
      params: [marketsEntered[index]],
      target: marketEuler.address,
    });

    const underlyingToEToken = await marketEuler.underlyingToEToken(
      marketsEntered[index]
    );
    const underlyingToDToken = await marketEuler.underlyingToDToken(
      marketsEntered[index]
    );
  }

  const callsLendRes = await multicall({
    chain: "ethereum",
    calls: callsLend,
    abi: {
      inputs: [
        { internalType: "address", name: "underlying", type: "address" },
      ],
      name: "underlyingToEToken",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const lendRes = callsLendRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const callsBorrowRes = await multicall({
    chain: "ethereum",
    calls: callsBorrow,
    abi: {
      inputs: [
        { internalType: "address", name: "underlying", type: "address" },
      ],
      name: "underlyingToDToken",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
    },
  });

  const borrowRes = callsBorrowRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const borrowBalances = await getERC20Balances(ctx, chain, borrowRes);
  const lendBalances = await getERC20Balances(ctx, chain, lendRes);

  const balances = [];

  for (let i = 0; i < borrowBalances.length; i++) {
    const borrowBalance = borrowBalances[i];
    balances.push({
      chain: chain,
      category: "borrow",
      type: "debt",
      symbol: marketsRaw[i].symbol,
      decimals: marketsRaw[i].decimals,
      address: marketsRaw[i].address,
      amount: BigNumber.from(borrowBalance.amount),
      yieldsAddress: `${marketsRaw[i].address.toLowerCase()}-euler`,
    });
  }

  for (let i = 0; i < lendBalances.length; i++) {
    const lendBalance = lendBalances[i];
    balances.push({
      chain: chain,
      category: "lend",
      symbol: marketsRaw[i].symbol,
      decimals: 18, //seems all lending is 18 but borrow isn't?
      address: marketsRaw[i].address,
      amount: BigNumber.from(lendBalance.amount),
      yieldsAddress: `${marketsRaw[i].address.toLowerCase()}-euler`,
    });
  }

  return balances;
}
