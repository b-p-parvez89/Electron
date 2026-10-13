import { collectionHandlers } from "@/lib/crud";
import { gatewayOpts } from "@/lib/resources";
export const { GET, POST } = collectionHandlers(gatewayOpts);
