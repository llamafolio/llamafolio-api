import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";
import { getUnderlyingBalancesUniswap } from "@lib/underlying";

import VaultAbi from "./abis/Vault.json";

export async function getBalances(ctx, chain, contracts) {

  const balances = []
  let addressses = contracts.map((contract) => {
    return contract.address
  })

  addressses = [...new Set(addressses)];


  const balancesRaw = await getERC20Balances(ctx, chain,addressses)

  let fetchUnderlyings = balancesRaw.map(balance => {
    if (balance.amount.gt(0)) {
      return {
        address: balance.address,
        amount: BigNumber.from(balance.amount)
      }
    } else {
      return null
    }
  })

  let nonZeroBalances = balancesRaw.map(balance => {
    if (balance.amount.gt(0)) {
      return balance
    } else {
      return null
    }
  })

  fetchUnderlyings = fetchUnderlyings.filter(function(e){return e});
  nonZeroBalances = nonZeroBalances.filter(function(e){return e});

  const underlyingBalances = await getUnderlyingBalancesUniswap(chain, fetchUnderlyings)

  let calls = underlyingBalances.map((p) => {
    return {
      params: [],
      target: p.address
    }
  })

  const getUnderlyingBalancesRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:  {
      "inputs": [],
      "name": "getUnderlyingBalances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "amount0Current",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "amount1Current",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
  });

  const getUnderlyingBalances = getUnderlyingBalancesRes
    .filter((res) => res.success)
    .map((res) => res.output);

    const totalSupplyRes = await multicall({
      chain: chain,
      calls: calls,
      abi: {
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
    });

    const totalSupply = totalSupplyRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output));

      for (let index = 0; index < underlyingBalances.length; index++) {
        const underlyingBalance = underlyingBalances[index];
        for (let c = 0; c < underlyingBalance.details.length; c++) {
          const underlyingBalanceDetail = underlyingBalance[c];
          underlyingBalances[index].details[c].amount = BigNumber.from(getUnderlyingBalances[index]["amount"+c+"Current"]).mul(nonZeroBalances[index].amount).div(totalSupply[index])
          underlyingBalances[index].details[c].chain = chain

        }
      }


  for (let index = 0; index < underlyingBalances.length; index++) {
    const element = underlyingBalances[index];

    balances.push({
      chain: chain,
      category: "lp",
      symbol: nonZeroBalances[index].symbol,
      decimals: nonZeroBalances[index].decimals,
      address: nonZeroBalances[index].address,
      amount: nonZeroBalances[index].amount,
      underlyings: underlyingBalances[index].details,
      //yieldsAddress: masterRow.token.address
    });
  }

  return balances;

}
