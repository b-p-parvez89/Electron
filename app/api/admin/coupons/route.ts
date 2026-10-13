import { collectionHandlers } from "@/lib/crud";
import { couponOpts } from "@/lib/resources";
export const { GET, POST } = collectionHandlers(couponOpts);
