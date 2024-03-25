Object.defineProperties(BigInt.prototype, {
  toJSON: {
    value: function (this: bigint) {
      return this.toString()
    },
    configurable: true,
  },
})
