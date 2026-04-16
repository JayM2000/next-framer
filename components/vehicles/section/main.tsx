'use client';
import { trpc } from '@/trpc/client';
import React, { Suspense, useCallback, useMemo, useState } from 'react'
import { ErrorBoundary } from "react-error-boundary";
import { VehiclesTable } from '../components/vehicles-table';
import { PartRecord } from '../components/add-vehicle-modal';

export type PaginationMode = 'client' | 'api' | 'infinite';

// ── Error Fallback ─────────────────────────────────────
function ErrorFallback({ error, resetErrorBoundary }: { error: unknown; resetErrorBoundary: () => void }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
      <p className="text-lg font-semibold text-red-500">Oops! Something went wrong</p>
      <pre className="max-w-md text-sm text-muted-foreground whitespace-pre-wrap">{message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="rounded-md bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20"
      >
        Try again
      </button>
    </div>
  );
}

// ── Client-side pagination content (existing flow) ─────
function ClientPaginationContent({
  paginationMode,
  onPaginationModeChange,
}: {
  paginationMode: PaginationMode;
  onPaginationModeChange: (mode: PaginationMode) => void;
}) {
  const [vehicleData, { refetch, isLoading, isFetching, isRefetching }] =
    trpc.vehiclesParts.getAllVehicleParts.useSuspenseQuery()

  const [refetchError, setRefetchError] = React.useState<Error | null>(null)

  const isApiLoading = useMemo(() => {
    return isLoading || isFetching || isRefetching;
  }, [isFetching, isLoading, isRefetching]);

  const handleRefetch = React.useCallback(async () => {
    setRefetchError(null)
    const result = await refetch()
    if (result.error) {
      setRefetchError(result.error as unknown as Error)
    }
  }, [refetch])

  if (refetchError) throw refetchError

  return (
    <VehiclesTable
      isFallbackLoading={false}
      vehiclePartsData={vehicleData as PartRecord[]}
      isApiLoading={isApiLoading}
      refetch={handleRefetch}
      paginationMode={paginationMode}
      onPaginationModeChange={onPaginationModeChange}
    />
  )
}

// ── API pagination content ─────────────────────────────
function ApiPaginationContent({
  paginationMode,
  onPaginationModeChange,
}: {
  paginationMode: PaginationMode;
  onPaginationModeChange: (mode: PaginationMode) => void;
}) {
  const [apiPage, setApiPage] = useState(1);
  const [apiPageSize] = useState(100);
  const [apiSearch, setApiSearch] = useState('');

  const { data: paginatedResult, isLoading, isFetching, isRefetching, refetch } =
    trpc.vehiclesParts.getPaginatedVehicleParts.useQuery(
      { page: apiPage, pageSize: apiPageSize, search: apiSearch || undefined },
      // { keepPreviousData: true }
    );

  const isApiLoading = useMemo(() => {
    return isLoading || isFetching || isRefetching;
  }, [isFetching, isLoading, isRefetching]);

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleApiSearchChange = useCallback((search: string) => {
    setApiSearch(search);
    setApiPage(1);
  }, []);

  const handleApiPageChange = useCallback((page: number) => {
    setApiPage(page);
  }, []);

  return (
    <VehiclesTable
      isFallbackLoading={false}
      vehiclePartsData={(paginatedResult?.data as PartRecord[]) ?? []}
      isApiLoading={isApiLoading}
      refetch={handleRefetch}
      paginationMode={paginationMode}
      onPaginationModeChange={onPaginationModeChange}
      apiPage={paginatedResult?.page ?? apiPage}
      apiTotalPages={paginatedResult?.totalPages ?? 1}
      apiTotalCount={paginatedResult?.totalCount ?? 0}
      apiPageSize={apiPageSize}
      onApiPageChange={handleApiPageChange}
      apiSearch={apiSearch}
      onApiSearchChange={handleApiSearchChange}
    />
  )
}

// ── Infinite scroll content ────────────────────────────
function InfiniteScrollContent({
  paginationMode,
  onPaginationModeChange,
}: {
  paginationMode: PaginationMode;
  onPaginationModeChange: (mode: PaginationMode) => void;
}) {
  const [infiniteSearch, setInfiniteSearch] = useState('');

  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
    isRefetching,
    refetch,
  } = trpc.vehiclesParts.getInfiniteVehicleParts.useInfiniteQuery(
    { limit: 100, search: infiniteSearch || undefined },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  );

  const isApiLoading = useMemo(() => {
    return isLoading || (isFetching && !isFetchingNextPage) || isRefetching;
  }, [isFetching, isFetchingNextPage, isLoading, isRefetching]);

  // Flatten all pages into a single array
  const allItems = useMemo(() => {
    if (!infiniteData?.pages) return [];
    return infiniteData.pages.flatMap((page) => page.items);
  }, [infiniteData?.pages]);

  const totalCount = infiniteData?.pages[0]?.totalCount ?? 0;

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const handleFetchNextPage = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleInfiniteSearchChange = useCallback((search: string) => {
    setInfiniteSearch(search);
  }, []);

  return (
    <VehiclesTable
      isFallbackLoading={false}
      vehiclePartsData={allItems as PartRecord[]}
      isApiLoading={isApiLoading}
      refetch={handleRefetch}
      paginationMode={paginationMode}
      onPaginationModeChange={onPaginationModeChange}
      // Infinite scroll props
      infiniteTotalCount={totalCount}
      infiniteHasNextPage={hasNextPage ?? false}
      infiniteIsFetchingNextPage={isFetchingNextPage}
      infiniteFetchNextPage={handleFetchNextPage}
      infiniteSearch={infiniteSearch}
      onInfiniteSearchChange={handleInfiniteSearchChange}
    />
  )
}

// ── Outer wrapper with boundaries ──────────────────────
const VechicleSection = () => {
  const [paginationMode, setPaginationMode] = useState<PaginationMode>('client');

  return (
    <div className="h-full">
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        {paginationMode === 'client' ? (
          <Suspense fallback={<VehiclesTable isFallbackLoading={true} vehiclePartsData={[]} />}>
            <ClientPaginationContent
              paginationMode={paginationMode}
              onPaginationModeChange={setPaginationMode}
            />
          </Suspense>
        ) : paginationMode === 'api' ? (
          <ApiPaginationContent
            paginationMode={paginationMode}
            onPaginationModeChange={setPaginationMode}
          />
        ) : (
          <InfiniteScrollContent
            paginationMode={paginationMode}
            onPaginationModeChange={setPaginationMode}
          />
        )}
      </ErrorBoundary>
    </div>
  )
}

export default VechicleSection