import { itemHandlers } from "@/lib/crud";
import { brandOpts } from "@/lib/resources";
export const { PUT, DELETE } = itemHandlers(brandOpts);
