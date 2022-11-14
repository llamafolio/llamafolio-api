import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BaseContext, Balance, Contract } from "@lib/adapter";
import { BigNumber, utils } from "ethers";

const BlockSpeedInSeconds = 15;
const DECIMALS = utils.parseEther("1.0");

interface assetsInfosParams {
  exhangeRate: number;
  compBorrowSpeeds: number;
  compSupplySpeeds: number;
  totalBorrows: number;
  totalSupply: number;
}

export async function getRewardsBalances(
  chain: Chain,
  contracts: Contract[],
  comptroller: Contract
) {
  const rewards: Balance[] = [];

  const nonNullContracts = contracts.filter((c) => c.amount.gt(0));

  const lends = nonNullContracts.filter((c) => c.category === "lend");
  const borrows = nonNullContracts.filter((c) => c.category === "borrow");

  const rewardsPartsFromLend = [];

  for (let i = 0; i < lends.length; i++) {
    const lend = lends[i];
    const infos = await getInfosFromAssets(chain, lend, comptroller);

    console.log(infos);

    // lend.amount.mul(infos.compSupplyApy)
    // rewardsPartsFromLend.push(infos)
  }
}

const getInfosFromAssets = async (
  chain: Chain,
  asset: Contract,
  comptroller: Contract
) => {
  if (!asset || !asset.decimals) {
    console.log("Missing or incorrect asset");

    return [];
  }

  const [
    exhangeRateRes,
    compBorrowSpeedsRes,
    compSupplySpeedsRes,
    totalBorrowsRes,
    totalSupplyRes,
  ] = await Promise.all([
    call({
      chain,
      target: asset.address,
      params: [],
      abi: {
        constant: false,
        inputs: [],
        name: "exchangeRateCurrent",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    }),

    call({
      chain,
      target: comptroller.address,
      params: [asset.address],
      abi: {
        constant: true,
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "compBorrowSpeeds",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: comptroller.address,
      params: [asset.address],
      abi: {
        constant: true,
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "compSupplySpeeds",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),

    call({
      chain,
      target: asset.address,
      params: [],
      abi: {
        constant: false,
        inputs: [],
        name: "totalBorrowsCurrent",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "nonpayable",
        type: "function",
      },
    }),

    call({
      chain,
      target: asset.address,
      params: [],
      abi: {
        constant: true,
        inputs: [],
        name: "totalSupply",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const exhangeRate = exhangeRateRes.output / Math.pow(10, 18);
  const compBorrowSpeeds = compBorrowSpeedsRes.output / Math.pow(10, 18);
  const compSupplySpeeds = compSupplySpeedsRes.output / Math.pow(10, 18);
  const totalBorrows = totalBorrowsRes.output / Math.pow(10, 6);
  const totalSupply = (totalSupplyRes.output * exhangeRate) / Math.pow(10, 6);

  const compToBorrowersPerDay =
    (compBorrowSpeeds * (60 * 60 * 24)) / BlockSpeedInSeconds;
  const compToSuppliersPerDay =
    (compSupplySpeeds * (60 * 60 * 24)) / BlockSpeedInSeconds;

  const compBorrowApy =
    100 *
    (Math.pow(1 + (39.28 * compToBorrowersPerDay) / totalBorrows, 365) - 1);
  const compSupplyApy =
    100 *
    (Math.pow(1 + (39.28 * compToSuppliersPerDay) / totalSupply, 365) - 1);

  console.log("COMP Borrow APY %:", compBorrowApy);
  console.log("COMP Supply APY %:", compSupplyApy);

  return { compBorrowApy, compSupplyApy };
};

// compPrice = compPrice / 1e6;  // price feed is USD price with 6 decimal places
// assetPrice = assetPrice / 1e6;

// const mantissa = 18 + parseInt(underlyingDecimals) - cTokenDecimals;
// exchangeRate = +exchangeRate.toString() / Math.pow(10, 18);

// // compSpeed = compSpeed / 1e18; // COMP has 18 decimal places
// compBorrowSpeed = compBorrowSpeed / 1e18;
// compSupplySpeed = compSupplySpeed / 1e18;
// compPrice = compPrice / 1e6;  // price feed is USD price with 6 decimal places
// assetPrice = assetPrice / 1e6;
// totalBorrows = +totalBorrows.toString() / (Math.pow(10, underlyingDecimals));
// totalSupply = (+totalSupply.toString() * exchangeRate) / (Math.pow(10, underlyingDecimals));

// export async function getRewardsBalances(
//   chain: Chain,
//   contracts: Contract[]
// ) {
//   const rewards: Balance[] = [];

//   const nonNullContracts = contracts.filter((c) => c.amount.gt(0));
//   const lends = nonNullContracts.filter((c) => c.category === "lend");
//   const borrows = nonNullContracts.filter((c) => c.category === "borrow");

//   const infos = await getInfosFromAssets(chain, lends[0]);
// }

// const getInfosFromAssets = async (chain: Chain, asset: Contract) => {
//   const [
//     underlyingRes,
//     interestRateModelRes,
//     borrowRatePerBlockRes,
//     supplyRatePerBlockRes,
//   ] = await Promise.all([
//     call({
//       chain,
//       target: asset.address,
//       params: [],
//       abi: {
//         constant: true,
//         inputs: [],
//         name: "underlying",
//         outputs: [{ internalType: "address", name: "", type: "address" }],
//         payable: false,
//         stateMutability: "view",
//         type: "function",
//       },
//     }),

//     call({
//       chain,
//       target: asset.address,
//       params: [],
//       abi: {
//         constant: true,
//         inputs: [],
//         name: "interestRateModel",
//         outputs: [
//           {
//             internalType: "contract InterestRateModel",
//             name: "",
//             type: "address",
//           },
//         ],
//         payable: false,
//         stateMutability: "view",
//         type: "function",
//       },
//     }),

//     call({
//       chain,
//       target: asset.address,
//       params: [],
//       abi: {
//         constant: true,
//         inputs: [],
//         name: "borrowRatePerBlock",
//         outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//         payable: false,
//         stateMutability: "view",
//         type: "function",
//       },
//     }),

//     call({
//       chain,
//       target: asset.address,
//       params: [],
//       abi: {
//         constant: true,
//         inputs: [],
//         name: "supplyRatePerBlock",
//         outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//         payable: false,
//         stateMutability: "view",
//         type: "function",
//       },
//     }),
//   ]);

//   const underlying = underlyingRes.output;
//   const interestRateModel = interestRateModelRes.output;

//   const [underlyingsDecimalsRes, blockPerYearRes] = await Promise.all([
//     call({
//       chain,
//       target: underlying,
//       params: [],
//       abi: {
//         inputs: [],
//         name: "decimals",
//         outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
//         stateMutability: "view",
//         type: "function",
//       },
//     }),

//     call({
//       chain,
//       target: interestRateModel,
//       params: [],
//       abi: {
//         constant: true,
//         inputs: [],
//         name: "blocksPerYear",
//         outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
//         payable: false,
//         stateMutability: "view",
//         type: "function",
//       },
//     }),
//   ]);

//   const YEAR = 365
//   const borrowRatePerBlock = borrowRatePerBlockRes.output;
//   const supplyRatePerBlock = supplyRatePerBlockRes.output;
//   const underlyingsDecimals = underlyingsDecimalsRes.output;
//   const blockPerYear = blockPerYearRes.output;

//   const mantissa = 18 + (8 - parseInt(underlyingsDecimals))
//   const blockPerDay = blockPerYear / YEAR

//   const comp_supply_APY = (((Math.pow((supplyRatePerBlock / Math.pow(10, mantissa) * blockPerDay + 1),YEAR))) - 1) * 100
//   const comp_borrow_APY = (((Math.pow((borrowRatePerBlock / Math.pow(10, mantissa) * blockPerDay + 1),YEAR))) - 1) * 100

//   console.log(comp_supply_APY);
//   console.log(comp_borrow_APY);

// };
