export async function fetchOpenSeaUser(address: string): Promise<string | undefined> {
  const openSeaUser = await fetch(`https://api.opensea.io/user/${address}?format=json`)
  const json = await openSeaUser.json()
  return json.username
}
