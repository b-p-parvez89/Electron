import { collectionHandlers } from "@/lib/crud";
import { courierOpts } from "@/lib/resources";
export const { GET, POST } = collectionHandlers(courierOpts);
