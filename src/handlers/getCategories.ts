import { Categories } from "@lib/category";
import { success } from "./response";

export async function handler(event, context) {
  return success({
    data: Object.values(Categories),
  });
}
