import { itemHandlers } from "@/lib/crud";
import { categoryOpts } from "@/lib/resources";
export const { PUT, DELETE } = itemHandlers(categoryOpts);
