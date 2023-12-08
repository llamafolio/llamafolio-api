// SEE: https://github.com/ourzora/nft-metadata

function parseDataUri(uri: string) {
  const commaIndex = uri.indexOf(',')
  if (commaIndex === -1) {
    return undefined
  }

  const mimeData = uri.substr(0, commaIndex + 1).match(/^data:([^;,]+)(.+)$/)

  if (!mimeData || !mimeData[1]) {
    return undefined
  }
  const data = uri.substr(commaIndex + 1)
  let body = data
  if (mimeData.length > 2 && mimeData[2]?.includes('base64')) {
    body = Buffer.from(data, 'base64').toString('utf-8')
  } else if (body.includes('%')) {
    try {
      body = decodeURIComponent(body)
    } catch {
      // no-op
    }
  }
  return {
    body,
    mime: mimeData[1],
  }
}

export async function fetchMimeType(uri: string, defaultType?: string): Promise<string | undefined> {
  if (uri.startsWith('data:')) {
    const parsedUri = parseDataUri(uri)
    if (parsedUri) {
      return parsedUri.mime
    }
    throw new Error('Cannot parse data uri')
  }

  if (uri.endsWith('.jpeg') || uri.endsWith('.jpg')) {
    return 'image/jpeg'
  }

  if (uri.includes('.png')) {
    return 'image/png'
  }
  try {
    const response = await fetch(uri, { method: 'HEAD' })

    return response.headers.get('content-type') || undefined
  } catch (e: any) {
    console.warn(`Failed to fetch mimetype for uri: ${uri} because: ${e?.message || 'Unknown Error occurred'}`)
    return defaultType
  }
}

export function createDataURI(mime: string, data: string) {
  const buff = Buffer.from(data, 'utf-8')
  return `data:${mime};base64,${buff.toString('base64')}`
}
