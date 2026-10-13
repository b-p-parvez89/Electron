import { collectionHandlers } from "@/lib/crud";
import { brandOpts } from "@/lib/resources";
export const { GET, POST } = collectionHandlers(brandOpts);
