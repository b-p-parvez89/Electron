import { itemHandlers } from "@/lib/crud";
import { gatewayOpts } from "@/lib/resources";
export const { PUT, DELETE } = itemHandlers(gatewayOpts);
