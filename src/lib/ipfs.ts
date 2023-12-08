import environment from '@environment'
import { cid as isCID } from 'is-ipfs'

export async function getCID(url: string) {
  // NOTE: ESM issue
  // const { cid: isCID } = await import('is-ipfs')

  const splitUrl = url.split('/')

  for (const split of splitUrl) {
    if (isCID(split)) {
      return split
    }

    const splitOnDot = split.split('.')[0]
    if (isCID(splitOnDot)) {
      return splitOnDot
    }
  }

  return null
}

export function isIPFS(uri: string) {
  return !!getCID(uri)
}

export async function getIPFSUrl(uri: string) {
  const { cid: isCID } = await import('is-ipfs')

  const cid = await getCID(uri)
  if (cid) {
    const splitUrl = uri.split(cid)

    if (isCID(cid)) {
      return `${environment.IPFS_GATEWAY_URL}/ipfs/${cid}${splitUrl[1]}`
    }

    // Case 1 - the ipfs://cid path
    if (uri.includes(`ipfs://${cid}`)) {
      return `${environment.IPFS_GATEWAY_URL}/ipfs/${cid}${splitUrl[1]}`
    }

    // Case 2 - the /ipfs/cid path (this should cover ipfs://ipfs/cid as well
    if (uri.includes(`/ipfs/${cid}`)) {
      return `${environment.IPFS_GATEWAY_URL}/ipfs/${cid}${splitUrl[1]}`
    }

    // Case 3 - the /ipns/cid path
    if (uri.includes(`/ipns/${cid}`)) {
      return `${environment.IPFS_GATEWAY_URL}/ipns/${cid}${splitUrl[1]}`
    }
  }

  return uri
}
