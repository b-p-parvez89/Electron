import { collectionHandlers } from "@/lib/crud";
import { categoryOpts } from "@/lib/resources";
export const { GET, POST } = collectionHandlers(categoryOpts);
