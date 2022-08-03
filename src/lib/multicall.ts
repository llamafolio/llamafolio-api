import { multiCall } from "@defillama/sdk/build/abi/index";

export type Call = {
  chain: string;
  target: string;
  params: any[];
  abi: object | string;
};

export type MultiCallParams = Parameters<typeof multiCall>[0] & {
  batchSize?: number;
  throwOnError?: boolean;
};

export async function multicall(params: MultiCallParams) {
  const batchSize = params.batchSize || 50;
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
      if (!res.success) {
        if (params.throwOnError) {
          throw Error(`Multicall failed for ${JSON.stringify(res)}`);
        }
        console.log(`Multicall failed for ${JSON.stringify(res)}`);
      } else {
        multicallRes.push(res);
      }
    }
  }

  return multicallRes;
}

function sliceIntoChunks<T>(arr: T[], chunkSize: number) {
  const res = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    res.push(chunk);
  }
  return res;
}
