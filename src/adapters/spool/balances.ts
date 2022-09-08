import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";


//
// Genesis Spool Vaults Contract Addresses
// Contract Name
// Contract Address
// DAI Higher Risk
// ​​
// DAI Lower Risk
// ​​
// USDC Higher Risk
// ​​
// USDC Lower Risk
// ​​
// USDT Higher Risk
// ​​
// USDT Lower Risk
//https://etherscan.io/address/0xe140bb5f424a53e0687bfc10f6845a5672d7e242#writeProxyContract​

export async function getBalances(ctx, chain, contracts) {

  let calls = contracts.map((contract) => {
    return {
      params: [],
      target: contract.address
    }
  })

  const strategyUnderlyingsRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
        "inputs": [],
        "name": "underlying",
        "outputs": [
          {
            "internalType": "contract IERC20",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
  });

  const strategyUnderlyings = strategyUnderlyingsRes
    .filter((res) => res.success)
    .map((res) => res.output);

    console.log(strategyUnderlyings, 'strategyUnderlyingsRes')


}
