import { Chain } from "@defillama/sdk/build/general"
import { BaseContext, Balance } from "@lib/adapter"
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { abi } from "@lib/erc20";
import { multicall } from "@lib/multicall";

export async function getStMaticInfos  (ctx:BaseContext, chain:Chain, contracts:any) {
    const balance:Balance[] = []

    const callBalances = contracts.map((token:Token) => ({
      target: token.address,
      params: [ctx.address]
    }))
  
    const balanceOf = await multicall({
      chain,
      calls: callBalances,
      abi: abi.balanceOf
    })
  
    for (let i = 0; i < contracts.length; i++) {
      if(!balanceOf[i].success) {
        continue;
      }
      const callConverter = contracts.map((token:Token) => ({
        target: token.address,
        params: [balanceOf[i].output]
      }))
  
      const convertStMaticToMatic = await multicall ({
        chain,
        calls: callConverter,
        abi : {
          "inputs": [
            { "internalType": "uint256", "name": "_balance", "type": "uint256" }
          ],
          "name": "convertStMaticToMatic",
          "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "uint256", "name": "", "type": "uint256" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
          ],
          "stateMutability": "view",
          "type": "function"
        },
      })
      const formatedBalance = convertStMaticToMatic[0].output
      const amount = BigNumber.from(formatedBalance[0])
  
      balance.push({
        ...contracts[i],
        amount,
        underlyings: [{...contracts[i].underlyings[0], amount}]
      })
    }
    return balance
  }