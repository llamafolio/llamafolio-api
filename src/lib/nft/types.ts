export const NFT_ERC_TYPES = ['erc721', 'erc1155'] as const

export type NFT_ERC_TYPE = (typeof NFT_ERC_TYPES)[number]
