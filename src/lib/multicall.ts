import { multiCall } from "@defillama/sdk/build/abi/index";

export type MultiCallParams = Parameters<typeof multiCall>[0];

export type Calls = MultiCallParams["calls"];

export type MultiCallResult = {
  success: boolean;
  input: {
    target: string;
    params: any[];
  };
  output: any;
};

export async function multicall(params: MultiCallParams) {
  const multicallRes = await multiCall(params);

  return multicallRes.output as MultiCallResult[];
}
