import { fetchOpenSeaUser } from "../src/labels/opensea/index"
import { fetchENSName } from "../src/labels/ens/index"


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

  const foundNames = []
  foundNames.push(
    {
      "source": "opensea",
      "label": await fetchOpenSeaUser(address)
    },
    {
      "source": "ens_main",
      "label": await fetchENSName(address)
    }
  )
  console.table(foundNames)

}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
