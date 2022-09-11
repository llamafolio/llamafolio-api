import { Categories } from "@lib/category";
import { success } from "./response";

export function handler() {
  return success(
    {
      data: Object.values(Categories),
    },
    { maxAge: 10 * 60 }
  );
}
