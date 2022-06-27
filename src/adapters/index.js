const wallet = require("./wallet");
const geist = require("./geist");
const pancakeswap = require("./pancakeswap");
const valas = require("./valas");

const adapters = [wallet, geist, pancakeswap, valas];

module.exports = { adapters };
