import type { Contract } from '@lib/adapter'

export const cvxCRVStaker: Contract = {
  chain: 'ethereum',
  address: '0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e',
  token: '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7',
  rewarder: '0x7091dbb7fcbA54569eF1387Ac89Eb2a5C9F6d2EA',
}

export const stkCvxCrvStaker: Contract = {
  chain: 'ethereum',
  address: '0xaa0c3f5f7dfd688c6e646f66cd2a6b66acdbe434',
  underlyings: ['0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7'],
}
