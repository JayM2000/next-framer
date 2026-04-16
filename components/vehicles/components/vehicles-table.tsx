import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PartRecord } from "@/components/vehicles/components/add-vehicle-modal"
import { PaginationMode } from "@/components/vehicles/section/main"
import { cn } from "@/lib/utils"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Database,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ScrollText,
  SlidersHorizontal,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// ── Lazy-load modal (defers XLSX import until needed) ──
const AddVehicleModal = dynamic(
  () =>
    import("@/components/vehicles/components/add-vehicle-modal").then((m) => ({
      default: m.AddVehicleModal,
    })),
  { ssr: false, loading: () => null }
)

// ── Types ──────────────────────────────────────────────
type Part = {
  id: number
  part_number: string
  part_name: string
  category: string
  brand: string
  compatible_vehicles: string
  description: string
  price: number
  stock_quantity: number
  image_url: string
  video_url: string
  is_active: boolean
}

// ── Column Definitions ─────────────────────────────────
const columns: ColumnDef<Part>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "part_number",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Part #
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">
        {row.getValue("part_number")}
      </span>
    ),
  },
  {
    accessorKey: "part_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Part Name
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("part_name")}</span>
    ),
  },
  {
    accessorKey: "category",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Badge variant="outline" className="text-[10px]">
        {row.getValue("category")}
      </Badge>
    ),
  },
  {
    accessorKey: "brand",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Brand
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Price
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const price = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price)
      return <span className="font-semibold">{formatted}</span>
    },
  },
  {
    accessorKey: "stock_quantity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="-ml-3 h-8 text-xs font-semibold"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Stock
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const qty: number = row.getValue("stock_quantity")
      return (
        <span
          className={cn(
            "font-medium",
            qty < 5 && "font-bold text-red-500 dark:text-red-400"
          )}
        >
          {qty}
          {qty < 5 && qty > 0 && (
            <span className="ml-1.5 text-[10px] font-normal text-red-400">
              Low
            </span>
          )}
          {qty === 0 && (
            <span className="ml-1.5 text-[10px] font-normal text-red-400">
              Out
            </span>
          )}
        </span>
      )
    },
  },
  {
    accessorKey: "compatible_vehicles",
    header: "Compatible Vehicles",
    cell: ({ row }) => {
      const val = row.getValue("compatible_vehicles") as string
      return val ? (
        <span className="max-w-[180px] truncate block text-xs" title={val}>
          {val}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const val = row.getValue("description") as string
      return val ? (
        <span className="max-w-[200px] truncate block text-xs" title={val}>
          {val}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )
    },
  },
  {
    accessorKey: "image_url",
    header: "Image",
    enableSorting: false,
    cell: ({ row }) => {
      const url = row.getValue("image_url") as string
      if (!url) return <span className="text-muted-foreground">—</span>
      return (
        <button
          type="button"
          className="preview-image-btn group relative h-8 w-8 shrink-0 rounded overflow-hidden border border-white/15 dark:border-white/10 hover:border-indigo-400/50 transition-colors cursor-pointer"
          data-image-url={url}
          title="Click to preview"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none"
              const fallback = (e.target as HTMLImageElement).nextElementSibling
              if (fallback) fallback.classList.remove("hidden")
            }}
          />
          <div className="hidden h-full w-full items-center justify-center bg-white/5">
            <ImageIcon className="h-3 w-3 text-muted-foreground" />
          </div>
        </button>
      )
    },
  },
  {
    accessorKey: "video_url",
    header: "Video",
    enableSorting: false,
    cell: ({ row }) => {
      const url = row.getValue("video_url") as string
      if (!url) return <span className="text-muted-foreground">—</span>
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 dark:border-white/10 bg-white/5 dark:bg-black/20 hover:border-indigo-400/50 transition-colors"
          title={url}
          onClick={(e) => e.stopPropagation()}
        >
          <Play className="h-3.5 w-3.5 text-indigo-400" />
        </a>
      )
    },
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean
      return isActive ? (
        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
          Active
        </Badge>
      ) : (
        <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 dark:bg-red-500/20 dark:text-red-400">
          Inactive
        </Badge>
      )
    },
  },
]

// ── Row height for virtualization ──────────────────────
const ROW_HEIGHT = 48

// ── Table Component ────────────────────────────────────
export const VehiclesTable = ({
  isFallbackLoading,
  vehiclePartsData,
  isApiLoading,
  refetch,
  paginationMode,
  onPaginationModeChange,
  // API pagination props
  apiPage,
  apiTotalPages,
  apiTotalCount,
  apiPageSize,
  onApiPageChange,
  apiSearch,
  onApiSearchChange,
  // Infinite scroll props
  infiniteTotalCount,
  infiniteHasNextPage,
  infiniteIsFetchingNextPage,
  infiniteFetchNextPage,
  infiniteSearch,
  onInfiniteSearchChange,
}: {
  isFallbackLoading: boolean,
  vehiclePartsData: PartRecord[],
  isApiLoading?: boolean,
  refetch?: () => void,
  paginationMode?: PaginationMode,
  onPaginationModeChange?: (mode: PaginationMode) => void,
  // API pagination props
  apiPage?: number,
  apiTotalPages?: number,
  apiTotalCount?: number,
  apiPageSize?: number,
  onApiPageChange?: (page: number) => void,
  apiSearch?: string,
  onApiSearchChange?: (search: string) => void,
  // Infinite scroll props
  infiniteTotalCount?: number,
  infiniteHasNextPage?: boolean,
  infiniteIsFetchingNextPage?: boolean,
  infiniteFetchNextPage?: () => void,
  infiniteSearch?: string,
  onInfiniteSearchChange?: (search: string) => void,
}) => {
  const isApiMode = paginationMode === 'api'
  const isInfiniteMode = paginationMode === 'infinite'
  const isServerMode = isApiMode || isInfiniteMode

  // ── Derive table data directly — no useState copy ────
  const data = useMemo<Part[]>(() => {
    if (!vehiclePartsData?.length) return []
    return vehiclePartsData.map((p: Record<string, unknown>) => ({
      id: p.id as number,
      part_number: p.part_number as string,
      part_name: p.part_name as string,
      category: (p.category as string) || "",
      brand: (p.brand as string) || "",
      compatible_vehicles: (p.compatible_vehicles as string) || "",
      description: (p.description as string) || "",
      price: Number(p.price) || 0,
      stock_quantity: Number(p.stock_quantity) || 0,
      image_url: (p.image_url as string) || "",
      video_url: (p.video_url as string) || "",
      is_active: p.is_active !== false,
    }))
  }, [vehiclePartsData])

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [globalFilter, setGlobalFilter] = useState("")
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [hasOpenedModal, setHasOpenedModal] = useState(false)

  // Debounce timer for server-side search (API + infinite)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [localServerSearch, setLocalServerSearch] = useState(
    isApiMode ? (apiSearch ?? "") : (infiniteSearch ?? "")
  )

  // Sync localServerSearch when search prop changes
  useEffect(() => {
    if (isApiMode) {
      setLocalServerSearch(apiSearch ?? "")
    } else if (isInfiniteMode) {
      setLocalServerSearch(infiniteSearch ?? "")
    }
  }, [apiSearch, infiniteSearch, isApiMode, isInfiniteMode])

  const handleServerSearchInput = useCallback((value: string) => {
    setLocalServerSearch(value)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      if (isApiMode) {
        onApiSearchChange?.(value)
      } else if (isInfiniteMode) {
        onInfiniteSearchChange?.(value)
      }
    }, 400)
  }, [isApiMode, isInfiniteMode, onApiSearchChange, onInfiniteSearchChange])

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [])

  // Handle image preview clicks from the table (since column defs are static)
  const handleTableClick = useCallback((e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest(".preview-image-btn")
    if (btn) {
      e.stopPropagation()
      const url = btn.getAttribute("data-image-url")
      if (url) setPreviewImage(url)
    }
  }, [])

  useEffect(() => {
    if (addModalOpen && !hasOpenedModal) setHasOpenedModal(true)
  }, [addModalOpen, hasOpenedModal])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: isServerMode ? "" : globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isServerMode ? undefined : getPaginationRowModel(),
    manualPagination: isServerMode,
    ...(isServerMode ? { pageCount: -1 } : {}),
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase()
      const name = (row.getValue("part_name") as string).toLowerCase()
      const brand = (row.getValue("brand") as string).toLowerCase()
      const category = (row.getValue("category") as string).toLowerCase()
      return (
        name.includes(search) ||
        brand.includes(search) ||
        category.includes(search)
      )
    },
    initialState: {
      pagination: { pageSize: isServerMode ? 9999 : 20 },
    },
  })

  // ── Virtualization for infinite scroll mode ──────────
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rows = table.getRowModel().rows

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  })

  // ── IntersectionObserver sentinel for infinite scroll ──
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isInfiniteMode) return
    if (!sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry?.isIntersecting && infiniteHasNextPage && !infiniteIsFetchingNextPage) {
          infiniteFetchNextPage?.()
        }
      },
      { root: tableContainerRef.current, rootMargin: "200px" }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [isInfiniteMode, infiniteHasNextPage, infiniteIsFetchingNextPage, infiniteFetchNextPage])

  if (isFallbackLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // ── API Pagination helpers ──────────────────────────
  const currentApiPage = apiPage ?? 1
  const totalApiPages = apiTotalPages ?? 1
  const totalApiCount = apiTotalCount ?? 0
  const currentApiPageSize = apiPageSize ?? 100

  const canApiPrevPage = currentApiPage > 1
  const canApiNextPage = currentApiPage < totalApiPages

  const renderApiPageButtons = () => {
    if (totalApiPages <= 1) return null

    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = []

    if (totalApiPages <= 7) {
      for (let i = 1; i <= totalApiPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentApiPage > 3) pages.push("ellipsis-start")
      const start = Math.max(2, currentApiPage - 1)
      const end = Math.min(totalApiPages - 1, currentApiPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentApiPage < totalApiPages - 2) pages.push("ellipsis-end")
      pages.push(totalApiPages)
    }

    return pages.map((page, idx) => {
      if (page === "ellipsis-start" || page === "ellipsis-end") {
        return (
          <span
            key={page}
            className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
          >
            …
          </span>
        )
      }
      const isActive = page === currentApiPage
      return (
        <Button
          key={`api-page-${page}-${idx}`}
          variant={isActive ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-8 w-8 p-0 text-xs font-medium",
            isActive
              ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700"
              : "border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
          )}
          onClick={() => onApiPageChange?.(page)}
        >
          {page}
        </Button>
      )
    })
  }

  // ── Search placeholder text ─────────────────────────
  const searchPlaceholder = isInfiniteMode
    ? "Search all records (server)…"
    : isApiMode
      ? "Search all records (server)…"
      : "Search parts, brands, categories…"

  // ── Current search value ────────────────────────────
  const searchValue = isServerMode ? localServerSearch : globalFilter

  const handleSearchChange = (value: string) => {
    if (isServerMode) {
      handleServerSearchInput(value)
    } else {
      setGlobalFilter(value)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Toolbar ──────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between gap-4">
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="h-9 max-w-sm border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
        />
        <div className="flex items-center gap-2">
          {/* ── Pagination Mode Toggle ── */}
          {onPaginationModeChange && (
            <div className="flex h-9 items-center rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20 p-0.5">
              <button
                onClick={() => onPaginationModeChange('client')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                  paginationMode === 'client'
                    ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pagination
              </button>
              <button
                onClick={() => onPaginationModeChange('api')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                  isApiMode
                    ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Database className="h-3 w-3" />
                API Pagination
              </button>
              <button
                onClick={() => onPaginationModeChange('infinite')}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200",
                  isInfiniteMode
                    ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ScrollText className="h-3 w-3" />
                Infinite Scroll
              </button>
            </div>
          )}

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (refetch) {
                refetch();
              }
            }}
            disabled={isApiLoading || isFallbackLoading}
            className="h-9 border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
          >
            <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isApiLoading && "animate-spin")} />
            Refresh
          </Button>

          {/* Column visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              >
                <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value) => col.toggleVisibility(!!value)}
                  >
                    {col.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Vehicle button */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
            onClick={() => setAddModalOpen(true)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────── */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        ref={tableContainerRef}
        className="flex-1 min-h-0 overflow-auto rounded-xl border border-white/20 bg-white/15 shadow-lg shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/20"
        onClick={handleTableClick}
      >
        {isApiLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isInfiniteMode ? (
          /* ── VIRTUALIZED TABLE for infinite scroll ── */
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background [&_tr]:border-white/15 dark:[&_tr]:border-white/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-white/15 hover:bg-transparent dark:border-white/10"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {rows.length ? (
                <>
                  {/* Top spacer for virtualized rows */}
                  {virtualizer.getVirtualItems()[0]?.start > 0 && (
                    <tr>
                      <td
                        colSpan={columns.length}
                        style={{ height: virtualizer.getVirtualItems()[0]?.start }}
                      />
                    </tr>
                  )}
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index]
                    if (!row) return null
                    const isSelected = row.getIsSelected()
                    return (
                      <tr
                        key={row.id}
                        data-slot="table-row"
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        data-state={isSelected ? "selected" : undefined}
                        onClick={() => row.toggleSelected()}
                        className={cn(
                          "cursor-pointer border-b border-white/10 transition-colors duration-300 ease-out dark:border-white/5",
                          "hover:bg-white/10 dark:hover:bg-white/5",
                          isSelected
                            ? "bg-indigo-500/10 dark:bg-indigo-500/15"
                            : "bg-transparent"
                        )}
                        style={{ height: `${virtualRow.size}px` }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </tr>
                    )
                  })}
                  {/* Bottom spacer for virtualized rows */}
                  {(() => {
                    const virtualItems = virtualizer.getVirtualItems()
                    const lastItem = virtualItems[virtualItems.length - 1]
                    const bottomPad = lastItem
                      ? virtualizer.getTotalSize() - lastItem.end
                      : 0
                    return bottomPad > 0 ? (
                      <tr>
                        <td colSpan={columns.length} style={{ height: bottomPad }} />
                      </tr>
                    ) : null
                  })()}
                </>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          /* ── STANDARD TABLE for client/API pagination ── */
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background [&_tr]:border-white/15 dark:[&_tr]:border-white/10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-white/15 hover:bg-transparent dark:border-white/10"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => {
                    const isSelected = row.getIsSelected()
                    return (
                      <motion.tr
                        key={row.id}
                        data-slot="table-row"
                        data-state={isSelected ? "selected" : undefined}
                        onClick={() => row.toggleSelected()}
                        animate={
                          isSelected
                            ? {
                                scale: [1, 1.008, 1],
                                boxShadow: [
                                  "inset 3px 0 0 rgba(99,102,241,0.7), 0 0 0px rgba(99,102,241,0)",
                                  "inset 3px 0 0 rgba(99,102,241,0.8), 0 0 18px rgba(99,102,241,0.15)",
                                  "inset 3px 0 0 rgba(99,102,241,0.7), 0 0 12px rgba(99,102,241,0.08)",
                                ],
                              }
                            : {
                                scale: 1,
                                boxShadow:
                                  "inset 0px 0 0 rgba(99,102,241,0), 0 0 0px rgba(99,102,241,0)",
                              }
                        }
                        transition={{
                          scale: {
                            duration: 0.35,
                            ease: "easeInOut",
                            times: [0, 0.4, 1],
                          },
                          boxShadow: {
                            duration: 0.45,
                            ease: "easeOut",
                          },
                        }}
                        className={cn(
                          "cursor-pointer border-b border-white/10 transition-colors duration-300 ease-out dark:border-white/5",
                          "hover:bg-white/10 dark:hover:bg-white/5",
                          isSelected
                            ? "bg-indigo-500/10 dark:bg-indigo-500/15"
                            : "bg-transparent"
                        )}
                        style={{ transformOrigin: "center" }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </motion.tr>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}

        {/* ── Infinite scroll sentinel ── */}
        {isInfiniteMode && (
          <div ref={sentinelRef} className="flex items-center justify-center py-4">
            {infiniteIsFetchingNextPage ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more…
              </div>
            ) : infiniteHasNextPage ? (
              <span className="text-xs text-muted-foreground/60">Scroll for more</span>
            ) : data.length > 0 ? (
              <span className="text-xs text-muted-foreground/60">All records loaded</span>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Footer: Pagination controls ── */}
      {isInfiniteMode ? (
        /* ── INFINITE SCROLL FOOTER ── */
        <div className="flex shrink-0 items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="font-medium text-foreground">
                {table.getFilteredSelectedRowModel().rows.length} selected · {" "}
              </span>
            )}
            Loaded{" "}
            <span className="font-medium text-foreground">
              {data.length}
            </span>
            {" "}of{" "}
            <span className="font-medium text-foreground">
              {infiniteTotalCount ?? "?"}
            </span>
            {" "}rows
            <span className="ml-2 text-[10px] text-emerald-400/80">
              (Infinite · {virtualizer.getVirtualItems().length} rendered)
            </span>
          </p>
          {infiniteHasNextPage && !infiniteIsFetchingNextPage && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-white/20 bg-white/10 text-xs backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => infiniteFetchNextPage?.()}
            >
              Load more
            </Button>
          )}
        </div>
      ) : isApiMode ? (
        /* ── API PAGINATION FOOTER ── */
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <span className="font-medium text-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} selected · {" "}
                </span>
              )}
              Showing{" "}
              <span className="font-medium text-foreground">
                {totalApiCount === 0
                  ? 0
                  : (currentApiPage - 1) * currentApiPageSize + 1}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(
                  currentApiPage * currentApiPageSize,
                  totalApiCount
                )}
              </span>
              {" "}of{" "}
              <span className="font-medium text-foreground">
                {totalApiCount}
              </span>
              {" "}rows
              <span className="ml-2 text-[10px] text-indigo-400/80">
                (API · {currentApiPageSize}/page)
              </span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => onApiPageChange?.(1)}
              disabled={!canApiPrevPage}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => onApiPageChange?.(currentApiPage - 1)}
              disabled={!canApiPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {renderApiPageButtons()}
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => onApiPageChange?.(currentApiPage + 1)}
              disabled={!canApiNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => onApiPageChange?.(totalApiPages)}
              disabled={!canApiNextPage}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* ── CLIENT PAGINATION FOOTER (existing) ── */
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
              <Select
                value={
                  table.getState().pagination.pageSize === table.getFilteredRowModel().rows.length
                    ? "all"
                    : String(table.getState().pagination.pageSize)
                }
                onValueChange={(value) => {
                  if (value === "all") {
                    table.setPageSize(table.getFilteredRowModel().rows.length || 9999)
                  } else {
                    table.setPageSize(Number(value))
                  }
                }}
              >
                <SelectTrigger className="h-8 w-[70px] border-white/20 bg-white/10 text-xs backdrop-blur-sm dark:border-white/10 dark:bg-black/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <span className="font-medium text-foreground">
                  {table.getFilteredSelectedRowModel().rows.length} selected · {" "}
                </span>
              )}
              Showing{" "}
              <span className="font-medium text-foreground">
                {table.getFilteredRowModel().rows.length === 0
                  ? 0
                  : table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                    1}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) *
                    table.getState().pagination.pageSize,
                  table.getFilteredRowModel().rows.length
                )}
              </span>
              {" "}of{" "}
              <span className="font-medium text-foreground">
                {table.getFilteredRowModel().rows.length}
              </span>
              {" "}rows
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {(() => {
              const currentPage = table.getState().pagination.pageIndex
              const totalPages = table.getPageCount()
              if (totalPages <= 1) return null

              const pages: (number | "ellipsis-start" | "ellipsis-end")[] = []

              if (totalPages <= 7) {
                for (let i = 0; i < totalPages; i++) pages.push(i)
              } else {
                pages.push(0)
                if (currentPage > 2) pages.push("ellipsis-start")
                const start = Math.max(1, currentPage - 1)
                const end = Math.min(totalPages - 2, currentPage + 1)
                for (let i = start; i <= end; i++) pages.push(i)
                if (currentPage < totalPages - 3) pages.push("ellipsis-end")
                pages.push(totalPages - 1)
              }

              return pages.map((page, idx) => {
                if (page === "ellipsis-start" || page === "ellipsis-end") {
                  return (
                    <span
                      key={page}
                      className="flex h-8 w-8 items-center justify-center text-xs text-muted-foreground"
                    >
                      …
                    </span>
                  )
                }
                const isActive = page === currentPage
                return (
                  <Button
                    key={`page-${page}-${idx}`}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 text-xs font-medium",
                      isActive
                        ? "bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700"
                        : "border-white/20 bg-white/10 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
                    )}
                    onClick={() => table.setPageIndex(page)}
                  >
                    {page + 1}
                  </Button>
                )
              })
            })()}

            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 border-white/20 bg-white/10 p-0 backdrop-blur-sm dark:border-white/10 dark:bg-black/20"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Fullscreen Image Preview Lightbox ──────── */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            key="table-lightbox-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              key="table-lightbox-content"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative max-w-[90vw] max-h-[85vh] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-3 -right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/80 transition-colors shadow-lg"
              >
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-[85vh] rounded-xl border border-white/10 shadow-2xl object-contain"
                onError={() => setPreviewImage(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Vehicle Modal (lazy-loaded) ──────────── */}
      {hasOpenedModal && (
        <AddVehicleModal
          open={addModalOpen}
          onOpenChange={setAddModalOpen}
          onSuccess={() => {
            if (refetch) {
              refetch()
            }
          }}
        />
      )}
    </div>
  )
}
