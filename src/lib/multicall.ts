import { multiCall } from "@defillama/sdk/build/abi/index";

export type MultiCallParams = Parameters<typeof multiCall>[0];

export type Calls = MultiCallParams["calls"];
export type Call = Calls[number];

export type MultiCallResult<T = any> = {
  success: boolean;
  input: {
    target: string;
    params: any[];
  };
  output: T | null;
};

export async function multicall<T = any>(params: MultiCallParams) {
  const multicallRes = await multiCall(params);

  return multicallRes.output as MultiCallResult<T>[];
}
