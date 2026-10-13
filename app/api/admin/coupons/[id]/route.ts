import { itemHandlers } from "@/lib/crud";
import { couponOpts } from "@/lib/resources";
export const { PUT, DELETE } = itemHandlers(couponOpts);
