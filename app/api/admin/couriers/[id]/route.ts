import { itemHandlers } from "@/lib/crud";
import { courierOpts } from "@/lib/resources";
export const { PUT, DELETE } = itemHandlers(courierOpts);
