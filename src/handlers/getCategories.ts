import { Categories } from "@lib/category";
import { success } from "@handlers/response";

export async function handler() {
  return success(
    {
      data: Object.values(Categories),
    },
    { maxAge: 10 * 60 }
  );
}
