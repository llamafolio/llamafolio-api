import { fetchOpenSeaUser } from "../src/labels/opensea/index"
import { fetchENSName } from "../src/labels/ens/index"
import { fetchLlamaLabels } from "../src/labels/llamalabels/index"


function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: update-balances.ts
  // argv[2]: adapter
  // argv[3]: address
  if (process.argv.length < 3) {
    console.error("Missing user argument");
    return help();
  }
  const address = process.argv[2].toLowerCase();

  let llamaLabels = await fetchLlamaLabels(address)

  const foundNames = []
  const foundLinks = []

  if (llamaLabels) {
    llamaLabels = llamaLabels[0]
    for (let index = 0; index < llamaLabels.labels.length; index++) {
      const label = llamaLabels.labels[index];
      foundNames.push({
        "source": "llamafolio",
        "type": "label",
        "label": label
      })
    }


    for (const [key, value] of Object.entries(llamaLabels.links)) {
      foundLinks.push({
        "source": "llamafolio",
        "type": key,
        "label": value
      })
    }
  }



  foundNames.push(
    {
      "source": "opensea",
      "type": "label",
      "label": await fetchOpenSeaUser(address)
    },
    {
      "source": "ens_main",
      "type": "label",
      "label": await fetchENSName(address)
    }
  )
  console.log('Found labels: ')
  console.table(foundNames)

  console.log('Found links: ')
  console.table(foundLinks)

}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
