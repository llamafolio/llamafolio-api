const { ethers } = require("ethers");
const { Interface, FormatTypes } = require("ethers/lib/utils");

const iface = new Interface([
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
]);
// jsonAbi = iface.format(FormatTypes.json);
let abi = iface.format(FormatTypes.full);

console.log("=== ABI");
console.log(abi);

class Multicall {
  constructor() {
    this.abis = {};
    this.calls = {};
  }

  addAbi(key, abi) {}

  addCall(chain, abi) {}

  execute() {}
}

module.exports = Multicall;

const test = new Multicall();
test.addCall(
  "fantom",
  "function balanceOf(uint id) view returns (tuple(string name, address addr) user)",
  {
    target: "0x...",
    params: ["0x..."],
  }
);
