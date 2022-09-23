import fetch from "node-fetch";



export async function fetchLlamaLabels(address) {

  try {
    const llamaLabels = await fetch(`https://raw.githubusercontent.com/llamafolio/llamafolio-labels/main/labels/${address}.json`);
    const json = await llamaLabels.json()

    return json
  } catch (e) {
    return null
  }

}
