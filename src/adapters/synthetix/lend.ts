import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";
import { Token } from "@lib/token";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { Chain } from "@lib/chains";

export type GetLendBorrowBalancesParams = {
  synthetixContract: Contract;
  feePoolAddress: string;
  sUSD: Token;
};

export async function getLendBorrowBalances(
  ctx: BaseContext,
  chain: Chain,
  { synthetixContract, feePoolAddress, sUSD }: GetLendBorrowBalancesParams
) {
  let balances: Balance[] = [];

  const [suppliedRes, borrowedRes, feesAvailableRes] = await Promise.all([
    call({
      chain,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "collateral",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: synthetixContract.address,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "remainingIssuableSynths",
        outputs: [
          { internalType: "uint256", name: "maxIssuable", type: "uint256" },
          { internalType: "uint256", name: "alreadyIssued", type: "uint256" },
          {
            internalType: "uint256",
            name: "totalSystemDebt",
            type: "uint256",
          },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: feePoolAddress,
      params: [ctx.address],
      abi: {
        constant: true,
        inputs: [{ internalType: "address", name: "account", type: "address" }],
        name: "feesAvailable",
        outputs: [
          { internalType: "uint256", name: "", type: "uint256" },
          { internalType: "uint256", name: "", type: "uint256" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const lendAmount = BigNumber.from(suppliedRes.output);
  const lendingBalance: Balance = {
    ...synthetixContract,
    amount: lendAmount,
    underlyings: [{ ...synthetixContract.underlyings[0], amount: lendAmount }],
    category: "lend",
  };
  balances.push(lendingBalance);

  const borrowAmount = BigNumber.from(borrowedRes.output.alreadyIssued);
  const borrowBalance: Balance = {
    ...sUSD,
    amount: borrowAmount,
    category: "borrow",
  };
  balances.push(borrowBalance);

  const sUSDRewardAmount = BigNumber.from(feesAvailableRes.output[0]);
  const sUSDRewardBalance: Balance = {
    ...sUSD,
    amount: sUSDRewardAmount,
    category: "reward",
  };
  balances.push(sUSDRewardBalance);

  const SNXRewardAmount = BigNumber.from(feesAvailableRes.output[1]);
  const SNXRewardBalance: Balance = {
    ...synthetixContract,
    amount: SNXRewardAmount,
    underlyings: [
      {
        ...synthetixContract.underlyings[0],
        amount: SNXRewardAmount,
        claimable: SNXRewardAmount,
      },
    ],
    category: "reward",
  };
  balances.push(SNXRewardBalance);

  return balances;
}
