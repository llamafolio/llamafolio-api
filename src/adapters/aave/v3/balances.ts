import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";

import PoolAbi from "./abis/Pool.json";
import DataProviderAbi from "./abis/DataProvider.json";




export async function getBalances(ctx, contracts) {

  const balances = []
  for (let index = 0; index < contracts.length; index++) {
    const chain = contracts[index].chain;

    const provider = providers[chain]
    const AAVEPool = new ethers.Contract(
      contracts[index].address,
      PoolAbi,
      provider
    );


    const tokens = await AAVEPool.getReservesList()
    const tokenDetails = await getERC20Details(chain, tokens)

    const userAccountData = await AAVEPool.getUserAccountData(ctx.address)
    const healthFactor = userAccountData.healthFactor.toString() / 10 ** 18
    if (healthFactor < 100000) {
      console.log(`user healthFactor: ${healthFactor}`)
      //add to metadata @0xsign
    }

    let calls = [];
    for (let d = 0; d < tokenDetails.length; d++) {
      calls.push({
        params: [tokens[d], ctx.address],
        target: contracts[index].poolDataProvider,
      });
    }

    const getUserDetailsRes = await multicall({
      chain: chain,
      calls: calls,
      abi: abiGetUserReserveData,
    });

    const getUserDetails = getUserDetailsRes
      .filter((res) => res.success)
      .map((res) => res.output);



    const aTokensToGet = []
    for (let c = 0; c < getUserDetails.length; c++) {
      const userRow = getUserDetails[c];
      if (userRow.currentATokenBalance > 0) {
        aTokensToGet.push(tokenDetails[c].address)
      }
    }


      let getATokenAddressRes = []
      if (aTokensToGet.length > 0) {
        calls = [];
        for (let r = 0; r < aTokensToGet.length; r++) {
          calls.push({
            params: [aTokensToGet[r]],
            target: contracts[index].poolDataProvider,
          });
        }

       getATokenAddressRes = await multicall({
          chain: chain,
          calls: calls,
          abi: abiReserveTokens,
        });
      }

    for (let c = 0; c < getUserDetails.length; c++) {
      const userRow = getUserDetails[c];
      if (userRow.currentATokenBalance > 0) {
        const aToken =  getATokenAddressRes.find(
              (o) => o.input.params[0].toLowerCase() === tokenDetails[c].address.toLowerCase()
            );
        balances.push({
          chain: chain,
          category: "lend",
          symbol: tokenDetails[c].symbol,
          decimals: tokenDetails[c].decimals,
          address: tokenDetails[c].address,
          amount: BigNumber.from(userRow.currentATokenBalance),
          yieldsKey: `${aToken.output.aTokenAddress.toLowerCase()}-${(chain === 'avax'?"avalanche":chain)}` //need to get aToken address here
        });
      }

      if (userRow.currentVariableDebt > 0 || userRow.scaledVariableDebt > 0) {

        const balance = (userRow.currentVariableDebt > 0) ? userRow.currentVariableDebt : userRow.scaledVariableDebt
        balances.push({
          chain: chain,
          category: "borrow",
          symbol: tokenDetails[c].symbol,
          decimals: tokenDetails[c].decimals,
          address: tokenDetails[c].address,
          amount: BigNumber.from(balance),
          debt: true
        });
      }

    }


  }

  //missing rewards APY

  return balances;


}




const abiGetUserReserveData = {"inputs":[{"internalType":"address","name":"asset","type":"address"},{"internalType":"address","name":"user","type":"address"}],"name":"getUserReserveData","outputs":[{"internalType":"uint256","name":"currentATokenBalance","type":"uint256"},{"internalType":"uint256","name":"currentStableDebt","type":"uint256"},{"internalType":"uint256","name":"currentVariableDebt","type":"uint256"},{"internalType":"uint256","name":"principalStableDebt","type":"uint256"},{"internalType":"uint256","name":"scaledVariableDebt","type":"uint256"},{"internalType":"uint256","name":"stableBorrowRate","type":"uint256"},{"internalType":"uint256","name":"liquidityRate","type":"uint256"},{"internalType":"uint40","name":"stableRateLastUpdated","type":"uint40"},{"internalType":"bool","name":"usageAsCollateralEnabled","type":"bool"}],"stateMutability":"view","type":"function"}


const abiReserveTokens = {"inputs":[{"internalType":"address","name":"asset","type":"address"}],"name":"getReserveTokensAddresses","outputs":[{"internalType":"address","name":"aTokenAddress","type":"address"},{"internalType":"address","name":"stableDebtTokenAddress","type":"address"},{"internalType":"address","name":"variableDebtTokenAddress","type":"address"}],"stateMutability":"view","type":"function"}
