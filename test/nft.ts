import { paginatedFetch } from '@lib/fetcher'
import { sum } from '@lib/math'
import { fetchUserNFTsFrom, groupAlchemyNFTs } from '@lib/nft'

const alchemy = await paginatedFetch({
  fn: fetchUserNFTsFrom.alchemy,
  initialParams: { address: '0x9FB7E6090096C3A0a6b085C8e33d99e5610234fa', spamConfidenceLevel: 'LOW' },
  iterations: 8,
  pageKeyProp: 'pageKey',
})

// console.log(alchemy.flatMap((result) => result.ownedNfts).length)
const flattened = alchemy.flatMap((result) => result.ownedNfts)
const totalFloorValue = sum(flattened.map((nft) => nft.contract.openSeaMetadata?.floorPrice ?? 0))
// console.log({ totalFloorValue })
const grouped = groupAlchemyNFTs(flattened)
console.log(
  JSON.stringify(
    {
      total: alchemy[0].totalCount,
      totalFloorValue,
      nfts: grouped,
    },
    undefined,
    2,
  ),
)

// const nftPort = await paginatedFetch({
//   fn: fetchUserNFTsFrom.nftPort,
//   initialParams: { address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045' },
//   iterations: 3,
//   pageKeyProp: 'continuation',
// })

// const portFlat = nftPort.flatMap((result) => result.nfts)
// console.log(portFlat.length)
// console.log(JSON.stringify(portFlat, undefined, 2))
