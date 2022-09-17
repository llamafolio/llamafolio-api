import path from "path";
import fs from "fs";

function help() {}

async function main() {
  // argv[0]: ts-node
  // argv[1]: create-adapter.ts
  // argv[2]: adapter
  if (process.argv.length < 3) {
    console.error("Missing adapter argument");
    return help();
  }

  const name = process.argv[2];
  const src = path.join(__dirname, "..", "src", "adapters", "__template");
  const dst = path.join(__dirname, "..", "src", "adapters", name);

  const exists = fs.existsSync(dst);

  if (exists) {
    console.error(`Failed to create adapter: ${name} already exists`);
    return;
  }

  // flat (non recursive) copy
  fs.mkdirSync(dst);
  fs.readdirSync(src).forEach(function (child) {
    fs.copyFileSync(path.join(src, child), path.join(dst, child));
  });

  console.log(`Successfully created adapter. To try it out run:`);
  console.log("");
  console.log(
    `npm run adapter ${name} 0x0000000000000000000000000000000000000000`
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
