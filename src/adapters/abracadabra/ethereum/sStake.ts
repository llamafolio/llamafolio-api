import { BigNumber } from "ethers";
import { getERC20Details } from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { abi } from "@lib/erc20";

export async function getSStakeContract(chain: Chain, contract?: Contract) {
  const contracts: Contract[] = [];

  if (!contract) {
    console.log("Missing or incorrect contract");

    return [];
  }

  try {
    const underlyingTokenAddressRes = await call({
      chain,
      target: contract.address,
      params: [],
      abi: {
        inputs: [],
        name: "token",
        outputs: [
          { internalType: "contract IERC20", name: "", type: "address" },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    const underlyings = await getERC20Details(chain, [
      underlyingTokenAddressRes.output,
    ]);

    const stakeContract: Contract = {
      ...contract,
      underlyings,
    };
    contracts.push(stakeContract);

    return contracts;
  } catch (error) {
    console.log("Failed to get sStake contract");

    return [];
  }
}

export async function getSStakeBalance(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];
  const contract = contracts[0];

  if (!contract.underlyings?.[0]) {
    return [];
  }

  try {
    const [balanceOfRes, totalSupplyRes, balanceOfTokenInUnderlyingRes] =
      await Promise.all([
        call({
          chain,
          target: contract.address,
          params: [ctx.address],
          abi: abi.balanceOf,
        }),

        call({
          chain,
          target: contract.address,
          params: [],
          abi: {
            inputs: [],
            name: "totalSupply",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        }),

        call({
          chain,
          target: contract.underlyings?.[0].address,
          params: [contract.address],
          abi: abi.balanceOf,
        }),
      ]);

    const balanceOf = BigNumber.from(balanceOfRes.output);
    const totalSupply = BigNumber.from(totalSupplyRes.output);
    const balanceOfTokenInUnderlying = BigNumber.from(
      balanceOfTokenInUnderlyingRes.output
    );

    const formattedBalanceOf = balanceOf
      .mul(balanceOfTokenInUnderlying)
      .div(totalSupply);

    const balance: Balance = {
      chain,
      decimals: contract.decimals,
      address: contract.address,
      symbol: contract.symbol,
      amount: formattedBalanceOf,
      underlyings: [
        { ...contract.underlyings?.[0], amount: formattedBalanceOf },
      ],
      category: "stake",
    };

    balances.push(balance);

    return balances;
  } catch (error) {
    console.log("Failed to get sStake balance");

    return [];
  }
}
