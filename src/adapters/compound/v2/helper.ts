const Compound = require('@compound-finance/compound-js');

const provider = 'https://mainnet.infura.io/v3/' + process.env.infuraApiKey;

const cTokenToGetCompApy = Compound.cUSDC; // Pick an asset

const underlying = cTokenToGetCompApy.slice(1, 10);
const underlyingDecimals = Compound.decimals[underlying];
const cTokenDecimals = 8; // always 8
const comptroller = Compound.util.getAddress(Compound.Comptroller);
const pf = Compound.util.getAddress(Compound.PriceFeed);
const cTokenAddr = Compound.util.getAddress(cTokenToGetCompApy);
const apxBlockSpeedInSeconds = 13.15;

(async function() {

  // let compSpeed = await Compound.eth.read(
  //   comptroller,
  //   'function compSpeeds(address cToken) public returns (uint)',
  //   [ cTokenAddr ],
  //   { provider }
  // );

  let compBorrowSpeed = await Compound.eth.read(
    comptroller,
    'function compBorrowSpeeds(address cToken) public returns (uint)',
    [ cTokenAddr ],
    { provider }
  );

  let compSupplySpeed = await Compound.eth.read(
    comptroller,
    'function compSupplySpeeds(address cToken) public returns (uint)',
    [ cTokenAddr ],
    { provider }
  );

  let compPrice = await Compound.eth.read(
    pf,
    'function price(string memory symbol) external view returns (uint)',
    [ Compound.COMP ],
    { provider }
  );

  let assetPrice = await Compound.eth.read(
    pf,
    'function price(string memory symbol) external view returns (uint)',
    [ underlying ],
    { provider }
  );

  let totalBorrows = await Compound.eth.read(
    cTokenAddr,
    'function totalBorrowsCurrent() returns (uint)',
    [],
    { provider }
  );

  let totalSupply = await Compound.eth.read(
    cTokenAddr,
    'function totalSupply() returns (uint)',
    [],
    { provider }
  );

  let exchangeRate = await Compound.eth.read(
    cTokenAddr,
    'function exchangeRateCurrent() returns (uint)',
    [],
    { provider }
  );

  // Total supply needs to be converted from cTokens
  const mantissa = 18 + parseInt(underlyingDecimals) - cTokenDecimals;
  exchangeRate = +exchangeRate.toString() / Math.pow(10, 18);

  // compSpeed = compSpeed / 1e18; // COMP has 18 decimal places
  compBorrowSpeed = compBorrowSpeed / 1e18;
  compSupplySpeed = compSupplySpeed / 1e18;
  compPrice = compPrice / 1e6;  // price feed is USD price with 6 decimal places
  assetPrice = assetPrice / 1e6;
  totalBorrows = +totalBorrows.toString() / (Math.pow(10, underlyingDecimals));
  totalSupply = (+totalSupply.toString() * exchangeRate) / (Math.pow(10, underlyingDecimals));

  // console.log('compSpeed:', compSpeed);
  // console.log('compBorrowSpeed:', compBorrowSpeed);
  // console.log('compSupplySpeed:', compSupplySpeed);
  // console.log('compPrice:', compPrice);
  // console.log('assetPrice:', assetPrice);
  // console.log('totalBorrows:', totalBorrows);
  // console.log('totalSupply:', totalSupply);
  // console.log('exchangeRate:', exchangeRate);

  // const compPerDay = compSpeed * parseInt((60 * 60 * 24) / apxBlockSpeedInSeconds);
  const compToBorrowersPerDay = compBorrowSpeed * parseInt((60 * 60 * 24) / apxBlockSpeedInSeconds);
  const compToSuppliersPerDay = compSupplySpeed * parseInt((60 * 60 * 24) / apxBlockSpeedInSeconds);

  const compBorrowApy = 100 * (Math.pow((1 + (compPrice * compToBorrowersPerDay / (totalBorrows * assetPrice))), 365) - 1);
  const compSupplyApy = 100 * (Math.pow((1 + (compPrice * compToSuppliersPerDay / (totalSupply * assetPrice))), 365) - 1);

  console.log('COMP Borrow APY %:', compBorrowApy);
  console.log('COMP Supply APY %:', compSupplyApy);

})().catch(console.error);