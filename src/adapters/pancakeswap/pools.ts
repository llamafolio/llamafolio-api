import { multiCall } from "@defillama/sdk/build/abi/index";

export const pools = [
  {
    chain: "bsc",
    address: "0x804678fa97d91B974ec2af3c843270886528a9E6",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      symbol: "Cake",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "Cake",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x0eD7e52944161450477ee417DE9Cd3a859b14fD0",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      symbol: "Cake",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "Cake",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x58F876857a02D6762E0101bb5C46A8c1ED44Dc16",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x28415ff2C35b65B9E5c7de82126b4015ab9d031F",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47",
      symbol: "ADA",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "ADA",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x168B273278F3A8d302De5E879aA30690B7E6c28f",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xAD6cAEb32CD2c308980a548bD0Bc5AA4306c6c18",
      symbol: "BAND",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "BAND",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xDd5bAd8f8b360d76d12FdA230F8BAF42fe0022CF",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402",
      symbol: "DOT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "DOT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xB6e34b5C65Eda51bb1BD4ea5F79d385Fb94b9504",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x56b6fB708fC5732DEC1Afc8D8556423A2EDcCbD6",
      symbol: "EOS",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "EOS",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x824eb9faDFb377394430d2744fa7C42916DE3eCe",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x7EFaEf62fDdCCa950418312c6C91Aef321375A00",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "USDT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x3DcB1787a95D2ea0Eb7d00887704EeBF0D79bb13",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
      symbol: "TWT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "TWT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x7EB5D86FD78f3852a3e0e064f2842d45a3dB6EA2",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xcF6BB5389c92Bdda8a3747Ddb454cB7a64626C63",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x74E4716E431f45807DCF19f284c7aA99F18a4fbc",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      symbol: "ETH",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "ETH",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x61EB789d75A95CAa3fF50ed7E47b96c132fEc082",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      symbol: "BTCB",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "BTCB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xACF47CBEaab5c8A6Ee99263cfE43995f89fB3206",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xa1faa113cbE53436Df28FF0aEe54275c13B40975",
      symbol: "ALPHA",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "ALPHA",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x55d398326f99059fF775485246999027B3197955",
      symbol: "USDT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "USDT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x03F18135c44C64ebFdCBad8297fe5bDafdBbdd86",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
      symbol: "XRP",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "XRP",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x468b2DC8DC75990eE3E9dc0648965Ad6294E7914",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x0Eb3a705fc54725037CC9e008bDede697f62F335",
      symbol: "ATOM",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "ATOM",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x04EB8D58a47D2B45C9c2f673Ceb6ff26E32385E3",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x7F70642d88cf1C4a3a7abb072B53B929b653edA5",
      symbol: "YFII",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "YFII",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xCE383277847f8217392eeA98C5a8B4a7D27811b0",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x88f1A5ae2A3BF98AEAF342D26B30a79438c9142e",
      symbol: "YFI",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "YFI",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x014608E87AF97a054C9a49f81E1473076D51d9a3",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xD9bCcbbbDFd9d67BEb5d2273102CE0762421D1e3",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153",
      symbol: "FIL",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "FIL",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x1BdCebcA3b93af70b58C41272AEa2231754B23ca",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xa2B726B1145A4773F68593CF171187d8EBe4d495",
      symbol: "INJ",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "INJ",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xD8E2F8b6Db204c405543953Ef6359912FE3A88d6",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x47BEAd2563dCBf3bF2c9407fEa4dC236fAbA485A",
      symbol: "SXP",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "SXP",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x460b4193Ec4C1a17372Aa5FDcd44c520ba658646",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xA8c2B8eec3d368C0253ad3dae65a5F2BBB89c929",
      symbol: "CTK",
      decimals: "6",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "CTK",
      decimals: "6",
    },
  },
  {
    chain: "bsc",
    address: "0x73566ca86248bD12F0979793e4671e99a40299A7",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xf79037F6f6bE66832DE4E7516be52826BC3cBcc4",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x44EA47F2765fd5D26b7eF0222736AD6FD6f61950",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x728C5baC3C3e370E372Fc4671f9ef6916b814d8B",
      symbol: "UNFI",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "UNFI",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x356Dd24BfF8e23BdE0430f00ad0C290E33438bD7",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x63870A18B6e42b01Ef1Ad8A2302ef50B7132054F",
      symbol: "blink",
      decimals: "6",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "blink",
      decimals: "6",
    },
  },
  {
    chain: "bsc",
    address: "0x133ee93FE93320e1182923E1a640912eDE17C90C",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x4BD17003473389A42DAF6a0a729f6Fdb328BbBd7",
      symbol: "VAI",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "VAI",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x8645148dE4E339964bA480AE3478653b5bc6E211",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x233d91A0713155003fc4DcE0AFa871b508B3B715",
      symbol: "DITTO",
      decimals: "9",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "DITTO",
      decimals: "9",
    },
  },
  {
    chain: "bsc",
    address: "0xd63b5CecB1f40d626307B92706Df357709D05827",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xF21768cCBC73Ea5B6fd3C687208a7c2def2d966e",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x24EB18bA412701f278B172ef96697c4622b19da6",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x72fAa679E1008Ad8382959FF48E392042A8b06f7",
      symbol: "bALBT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "bALBT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x1B415C3ec8095AfBF9d78882b3a6263c4ad141B5",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xdFF8cb622790b7F92686c722b02CaB55592f152C",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x47C42b0A056A9C6e9C65b9Ef79020Af518e767A5",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x5Ac52EE5b2a633895292Ff6d8A89bB9190451587",
      symbol: "BSCX",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "BSCX",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x66FDB2eCCfB58cF098eaa419e5EfDe841368e489",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3",
      symbol: "DAI",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "DAI",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x2354ef4DF11afacb85a5C7f98B624072ECcddbB1",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      symbol: "USDC",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "USDC",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x71b01eBdDD797c8E9E0b003ea2f4FD207fBF46cC",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x4338665CBB7B2485A8855A139b75D5e34AB0DB94",
      symbol: "LTC",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "LTC",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xB2678C414ebC63c9CC6d1a0fC45f43E249B50fdE",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x78650B139471520656b9E7aA7A5e9276814a38e9",
      symbol: "BTCST",
      decimals: "17",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "BTCST",
      decimals: "17",
    },
  },
  {
    chain: "bsc",
    address: "0xC869A9943b702B03770B6A92d2b2d25cf3a3f571",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x948d2a81086A075b3130BAc19e4c6DEe1D2E3fE8",
      symbol: "Helmet",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "Helmet",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xC6b668548aA4A56792e8002A920d3159728121D5",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x928e55daB735aa8260AF3cEDadA18B5f70C72f1b",
      symbol: "FRONT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "FRONT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x7653D2c31440f04d2c6520D482dC5DbD7650f70a",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x541E619858737031A1244A5d0Cd47E5ef480342c",
      symbol: "wSOTE",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "wSOTE",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xEc6b56a736859AE8ea4bEdA16279Ecd8c60dA7EA",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      symbol: "UST",
      decimals: "18",
    },
    token1: {
      address: "0xF215A127A196e3988C09d052e16BcFD365Cd7AA3",
      symbol: "UST",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x91417426C3FEaA3Ca795921eB9FdD9715ad92537",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      symbol: "UST",
      decimals: "18",
    },
    token1: {
      address: "0xa04F060077D90Fe2647B61e4dA4aD1F97d6649dc",
      symbol: "UST",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xA3BfBbAd526C6B856B1Fdf73F99BCD894761fbf3",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      symbol: "UST",
      decimals: "18",
    },
    token1: {
      address: "0x62D71B23bF15218C7d2D7E48DBbD9e9c650B173f",
      symbol: "UST",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xC05654C66756eBB82c518598c5f1ea1a0199a563",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      symbol: "UST",
      decimals: "18",
    },
    token1: {
      address: "0x3947B992DC0147D2D89dF0392213781b04B25075",
      symbol: "UST",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x05faf555522Fa3F93959F86B41A3808666093210",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x23396cF899Ca06c4472205fC903bDB4de249D6fC",
      symbol: "UST",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "UST",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xcD68856b6E72E99b5eEaAE7d41Bb4A3b484c700D",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xbF7c81FFF98BbE61B40Ed186e4AfD6DDd01337fe",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x4288706624e3dD839b069216eB03B8B9819C10d2",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x190b589cf9Fb8DDEabBFeae36a813FFb2A702454",
      symbol: "BDO",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "BDO",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xF74ee1e10e097dc326a2ad004F9Cc95CB71088d3",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "WBNB",
      decimals: "18",
    },
    token1: {
      address: "0xC7d8D35EBA58a0935ff2D5a33Df105DD9f071731",
      symbol: "WBNB",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0x1F37d4226d23d09044B8005c127C0517BD7e94fD",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0xb59490aB09A0f526Cc7305822aC65f2Ab12f9723",
      symbol: "LIT",
      decimals: "18",
    },
    token1: {
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      symbol: "LIT",
      decimals: "18",
    },
  },
  {
    chain: "bsc",
    address: "0xC5768c5371568Cf1114cddD52CAeD163A42626Ed",
    symbol: "Cake-LP",
    decimals: "18",
    token0: {
      address: "0x762539b45A1dCcE3D36d080F74d1AED37844b878",
      symbol: "LINA",
      decimals: "18",
    },
    token1: {
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      symbol: "LINA",
      decimals: "18",
    },
  },
];

// Helper to get above pools info
async function getPools(addresses: string[]) {
  // TODO: Promise.all
  const symbols = await multiCall({
    chain: "bsc",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals = await multiCall({
    chain: "bsc",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const token0s = await multiCall({
    chain: "bsc",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "token0",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const token1s = await multiCall({
    chain: "bsc",
    calls: addresses.map((address) => ({
      target: address,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "token1",
      outputs: [{ internalType: "address", name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const pools = addresses.map((_, i) => ({
    // TODO: deal with names.success (boolean)
    chain: "bsc",
    address: addresses[i],
    symbol: symbols.output[i].output,
    decimals: decimals.output[i].output,
    token0: token0s.output[i].output,
    token1: token1s.output[i].output,
  }));

  const symbols0 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const symbols1 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "symbol",
      outputs: [{ internalType: "string", name: "", type: "string" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals0 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const decimals1 = await multiCall({
    chain: "bsc",
    calls: pools.map((pool) => ({
      target: pool.token0,
      params: [],
    })),
    abi: {
      constant: true,
      inputs: [],
      name: "decimals",
      outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  return pools.map((pool, i) => ({
    ...pool,
    token0: {
      address: pool.token0,
      symbol: symbols0.output[i].output,
      decimals: decimals0.output[i].output,
    },
    token1: {
      address: pool.token1,
      symbol: symbols1.output[i].output,
      decimals: decimals1.output[i].output,
    },
  }));
}
