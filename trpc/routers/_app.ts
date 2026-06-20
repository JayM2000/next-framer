import { createTRPCRouter } from "../init";
import { vehiclesPartsRouter } from "./vehiclesPart";
import { vaultRouter } from "./vault";
import { sessionsRouter } from "./sessions";

export const appRouter = createTRPCRouter({
  vehiclesParts: vehiclesPartsRouter,
  vault: vaultRouter,
  sessions: sessionsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
