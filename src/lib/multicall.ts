import { multiCall } from "@defillama/sdk/build/abi/index";
import { sliceIntoChunks } from "@lib/array";

export type MultiCallParams = Parameters<typeof multiCall>[0] & {
  batchSize?: number;
};

export async function multicall(params: MultiCallParams) {
  const batchSize = params.batchSize || 200;
  // split chunks
  const callsChunks = sliceIntoChunks(params.calls, batchSize);

  const chunksRes = await Promise.all(
    callsChunks.map((chunk) =>
      multiCall({
        ...params,
        calls: chunk,
      })
    )
  );

  // merge chunks
  // TODO: infer type from abi
  const multicallRes: any[] = [];
  for (const chunkRes of chunksRes) {
    for (const res of chunkRes.output) {
      multicallRes.push(res);
    }
  }

  return multicallRes;
}
