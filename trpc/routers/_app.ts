import { createTRPCRouter } from "../init";
import { vehiclesPartsRouter } from "./vehiclesPart";
import { vaultRouter } from "./vault";

export const appRouter = createTRPCRouter({
  vehiclesParts: vehiclesPartsRouter,
  vault: vaultRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
