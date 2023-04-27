export const TEST_ADDRESS = '0xbdfa4f4492dd7b7cf211209c4791af8d52bf5c50'
export const TEST_CHAIN = 'ethereum'

export const testData = {
  address: TEST_ADDRESS,
  chain: TEST_CHAIN,
} as const

export type TestData = typeof testData
