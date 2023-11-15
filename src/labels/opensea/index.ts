export async function fetchOpenSeaUser(address: `0x${string}`): Promise<string | undefined> {
  const response = await fetch(`https://api.opensea.io/user/${address}?format=json`)

  if (response.ok) {
    const json = await response.json()
    return json.username
  }
}
