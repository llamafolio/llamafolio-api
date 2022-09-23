import fetch from "node-fetch";



export async function fetchOpenSeaUser(address) {

  const openSeaUser = await fetch(`https://api.opensea.io/user/${address}?format=json`);
  const json = await openSeaUser.json()
  return (json.username)?json.username:null

}
