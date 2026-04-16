import VechicleSection from "@/components/vehicles/section/main";
import { HydrateClient, trpc } from "@/trpc/server";
export const dynamic = "force-dynamic";

export default async function VehiclesPage() {
  // Fire-and-forget prefetch — populates the query cache for instant data
  // on the client without blocking page render
  void trpc.vehiclesParts.getAllVehicleParts.prefetch();

  return (
    <HydrateClient>
      <div className="flex h-full flex-col gap-6">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Auto Parts Inventory
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and browse your complete auto parts catalog.
          </p>
        </div>
        <div className="flex-1 min-h-0">
          <VechicleSection />
        </div>
      </div>
    </HydrateClient>
  );
}
