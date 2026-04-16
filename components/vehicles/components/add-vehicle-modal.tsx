import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { trpc } from "@/trpc/client"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  ChevronDown,
  Download,
  FileSpreadsheet,
  ImageIcon,
  Loader2,
  Play,
  Plus,
  Upload,
  X,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import * as XLSX from "xlsx"

// ── Types ──────────────────────────────────────────────
export type PartRecord = {
  id?: number
  part_number: string
  part_name: string
  category: string
  brand: string
  compatible_vehicles: string
  description: string
  price: number | string
  stock_quantity: number | string
  image_url: string
  video_url: string
  is_active: boolean
}

const emptyPart: PartRecord = {
  part_number: "",
  part_name: "",
  category: "",
  brand: "",
  compatible_vehicles: "",
  description: "",
  price: "",
  stock_quantity: "",
  image_url: "",
  video_url: "",
  is_active: true,
}

type AddVehicleModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// ── Template column headers for Excel ──────────────────
const TEMPLATE_HEADERS = [
  "part_number",
  "part_name",
  "category",
  "brand",
  "compatible_vehicles",
  "description",
  "price",
  "stock_quantity",
  "image_url",
  "video_url",
  "is_active",
]

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    [
      "AP-EX-001",
      "Example Brake Pad",
      "Brakes",
      "Bosch",
      "Honda Civic 2020-2024",
      "High performance ceramic brake pads",
      "45.99",
      "100",
      "",
      "",
      "true",
    ],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Vehicle Parts")
  XLSX.writeFile(wb, "vehicle_parts_template.xlsx")
}

// ── Framer Motion Variants ─────────────────────────────
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}


// ── Animated Modal Shell ───────────────────────────────
function AnimatedModal({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const prevOverflowRef = useRef<string>("")

  // ESC key + body scroll lock (lock on open, restore on exit-complete)
  useEffect(() => {
    if (!open) return

    prevOverflowRef.current = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKey)

    return () => {
      document.removeEventListener("keydown", handleKey)
    }
  }, [open, onClose])

  // Auto-focus the modal when it opens
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus()
    }
  }, [open])

  // Restore scroll after exit animation finishes (not immediately on close)
  const handleExitComplete = useCallback(() => {
    document.body.style.overflow = prevOverflowRef.current
  }, [])

  if (typeof window === "undefined") return null

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="modal-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            style={{ willChange: "opacity" }}
            onClick={onClose}
          />

          {/* Content wrapper */}
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: {
                type: "spring",
                damping: 30,
                stiffness: 400,
                mass: 0.4,
              },
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: 10,
              transition: { duration: 0.15, ease: "easeIn" },
            }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            style={{ willChange: "transform, opacity" }}
          >
            <div
              ref={contentRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              className="pointer-events-auto w-full max-w-2xl md:max-w-none md:w-[60vw] max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-white/20 bg-white/70 p-5 text-xs/relaxed text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-2xl mx-4 outline-none dark:border-white/10 dark:bg-black/50 dark:shadow-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── Component ──────────────────────────────────────────
export function AddVehicleModal({
  open,
  onOpenChange,
  onSuccess,
}: AddVehicleModalProps) {
  const [activeTab, setActiveTab] = useState("single")
  const [form, setForm] = useState<PartRecord>({ ...emptyPart })

  // Bulk upload state
  const [bulkRecords, setBulkRecords] = useState<PartRecord[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(100)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()
  const { mutate, isPending: submitting } =
    trpc.vehiclesParts.insertIntoVehicleParts.useMutation({
      onSuccess: (data) => {
        if (activeTab === "bulk") {
          toast.success(
            "message" in data
              ? data.message
              : `Successfully inserted ${bulkRecords.length} records`
          )
          setBulkRecords([])
          setFileName(null)
          if (fileInputRef.current) fileInputRef.current.value = ""
        } else {
          toast.success("Vehicle part added successfully!")
          setForm({ ...emptyPart })
        }
        utils.vehiclesParts.getAllVehicleParts.invalidate()
        onSuccess()
        onOpenChange(false)
      },
      onError: (err) => {
        toast.error(
          `Something went wrong while creating vehicle parts refer error -> ${err}`
        )
      },
    })

  // ── Single form handlers ─────────────────────────────
  const updateField = useCallback(
    <K extends keyof PartRecord>(key: K, value: PartRecord[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSingleSubmit = async () => {
    if (!form.part_number.trim() || !form.part_name.trim()) {
      toast.error("Part Number and Part Name are required")
      return
    }

    try {
      mutate({
        ...form,
        price: form.price !== "" ? Number(form.price) : 0,
        stock_quantity:
          form.stock_quantity !== "" ? Number(form.stock_quantity) : 0,
      })
    } catch {
      toast.error("Network or Server error — please try again")
    }
  }

  // ── Bulk upload handlers ─────────────────────────────
  const parseExcelFile = useCallback((file: File) => {
    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<
          Record<string, string | number | boolean>
        >(worksheet)

        if (jsonData.length === 0) {
          toast.error("The uploaded file contains no data rows")
          return
        }

        const records: PartRecord[] = jsonData.map((row) => ({
          part_number: String(row.part_number || "").trim(),
          part_name: String(row.part_name || "").trim(),
          category: String(row.category || "").trim(),
          brand: String(row.brand || "").trim(),
          compatible_vehicles: String(
            row.compatible_vehicles || ""
          ).trim(),
          description: String(row.description || "").trim(),
          price:
            row.price != null && row.price !== ""
              ? Number(row.price)
              : "",
          stock_quantity:
            row.stock_quantity != null && row.stock_quantity !== ""
              ? Number(row.stock_quantity)
              : "",
          image_url: String(row.image_url || "").trim(),
          video_url: String(row.video_url || "").trim(),
          is_active:
            row.is_active === false ||
            row.is_active === "false" ||
            row.is_active === 0
              ? false
              : true,
        }))

        // Validate required fields
        const invalid = records.filter(
          (r) => !r.part_number || !r.part_name
        )
        if (invalid.length > 0) {
          toast.warning(
            `${invalid.length} row(s) are missing part_number or part_name — they will still be shown but may fail on submit`
          )
        }

        setBulkRecords(records)
        toast.success(`Parsed ${records.length} records from ${file.name}`)
      } catch {
        toast.error(
          "Failed to parse the file. Make sure it's a valid .xlsx or .csv file"
        )
      }
    }

    reader.readAsArrayBuffer(file)
  }, [])

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) parseExcelFile(file)
    },
    [parseExcelFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) parseExcelFile(file)
    },
    [parseExcelFile]
  )

  const removeBulkRecord = (index: number) => {
    setBulkRecords((prev) => prev.filter((_, i) => i !== index))
  }

  const handleBulkSubmit = async () => {
    if (bulkRecords.length === 0) {
      toast.error("No records to upload")
      return
    }

    const invalid = bulkRecords.filter(
      (r) => !r.part_number || !r.part_name
    )
    if (invalid.length > 0) {
      toast.error(
        `${invalid.length} record(s) are missing required fields (part_number, part_name). Please fix them first.`
      )
      return
    }

    try {
      mutate({
        records: bulkRecords.map((r) => ({
          ...r,
          price: r.price !== "" ? Number(r.price) : 0,
          stock_quantity:
            r.stock_quantity !== "" ? Number(r.stock_quantity) : 0,
        })),
      })
    } catch {
      toast.error("Network or Server error — please try again")
    }
  }

  const resetModal = () => {
    setForm({ ...emptyPart })
    setBulkRecords([])
    setFileName(null)
    setActiveTab("single")
    setVisibleCount(100)
    setPreviewImage(null)
  }

  const handleClose = useCallback(() => {
    resetModal()
    onOpenChange(false)
   
  }, [onOpenChange])

  return (
    <AnimatedModal open={open} onClose={handleClose}>
      {/* ── Header ─────────────────────────────────── */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-medium">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Plus className="h-4 w-4 text-white" />
            </div>
            Add Vehicle Parts
          </h2>
          <p className="text-xs text-muted-foreground">
            Add parts individually or bulk upload from an Excel spreadsheet.
          </p>
        </div>
        <button
          onClick={handleClose}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 overflow-hidden flex flex-col"
      >
        <TabsList className="w-full">
          <TabsTrigger value="single" className="flex-1 gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Single Entry
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex-1 gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Bulk Upload
          </TabsTrigger>
        </TabsList>

        {/* ── Single Entry Tab ─────────────────────── */}
        <TabsContent
          value="single"
          className="flex-1 overflow-y-auto p-1 mt-4"
        >
          <div className="grid gap-4">
            {/* Row 1: Part Number + Part Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="part_number">
                  Part Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="part_number"
                  placeholder="e.g. AP-BRK-001"
                  value={form.part_number}
                  onChange={(e) =>
                    updateField("part_number", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="part_name">
                  Part Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="part_name"
                  placeholder="e.g. Ceramic Brake Pads (Front)"
                  value={form.part_name}
                  onChange={(e) =>
                    updateField("part_name", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
            </div>

            {/* Row 2: Category + Brand */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g. Brakes"
                  value={form.category}
                  onChange={(e) =>
                    updateField("category", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  placeholder="e.g. Bosch"
                  value={form.brand}
                  onChange={(e) =>
                    updateField("brand", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
            </div>

            {/* Row 3: Price + Stock */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.price}
                  onChange={(e) =>
                    updateField("price", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock_quantity">Stock Quantity</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.stock_quantity}
                  onChange={(e) =>
                    updateField("stock_quantity", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
            </div>

            {/* Row 4: Compatible Vehicles */}
            <div className="space-y-1.5">
              <Label htmlFor="compatible_vehicles">
                Compatible Vehicles
              </Label>
              <Input
                id="compatible_vehicles"
                placeholder="e.g. Honda Civic 2020-2024, Toyota Corolla 2019-2023"
                value={form.compatible_vehicles}
                onChange={(e) =>
                  updateField("compatible_vehicles", e.target.value)
                }
                className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
              />
            </div>

            {/* Row 5: Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Detailed description of the part…"
                value={form.description}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                rows={3}
                className="flex w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/10 dark:bg-black/20 resize-none"
              />
            </div>

            {/* Row 6: Image URL + Video URL */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="image_url">Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://…"
                  value={form.image_url}
                  onChange={(e) =>
                    updateField("image_url", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="video_url">Video URL</Label>
                <Input
                  id="video_url"
                  type="url"
                  placeholder="https://…"
                  value={form.video_url}
                  onChange={(e) =>
                    updateField("video_url", e.target.value)
                  }
                  className="h-9 border-white/20 bg-white/5 dark:border-white/10 dark:bg-black/20"
                />
              </div>
            </div>

            {/* Row 7: Active status */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(checked) =>
                  updateField("is_active", !!checked)
                }
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active (available for sale)
              </Label>
            </div>
          </div>

          {/* Single Submit */}
          <div className="mt-6 flex justify-end gap-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="border-white/20 bg-white/10 dark:border-white/10 dark:bg-black/20"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSingleSubmit}
              disabled={submitting}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Adding…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Part
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ── Bulk Upload Tab ──────────────────────── */}
        <TabsContent
          value="bulk"
          className="flex-1 overflow-hidden flex flex-col mt-4"
        >
          {/* Download template button */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Upload a{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] dark:bg-black/30">
                .xlsx
              </code>{" "}
              or{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 text-[10px] dark:bg-black/30">
                .csv
              </code>{" "}
              file with your parts data.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              className="h-7 gap-1.5 border-white/20 bg-white/10 text-xs dark:border-white/10 dark:bg-black/20"
            >
              <Download className="h-3 w-3" />
              Template
            </Button>
          </div>

          {/* Drop zone */}
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer",
              dragOver
                ? "border-indigo-500 bg-indigo-500/10"
                : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10 dark:border-white/10 dark:bg-black/10 dark:hover:border-white/20"
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 mb-3">
              <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
            </div>
            {fileName ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium">{fileName}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setBulkRecords([])
                    setFileName(null)
                    if (fileInputRef.current)
                      fileInputRef.current.value = ""
                  }}
                  className="ml-1 rounded-full p-0.5 hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium">
                  Drag & drop your file here, or{" "}
                  <span className="text-indigo-400 underline underline-offset-2">
                    browse
                  </span>
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Supports .xlsx, .xls, .csv
                </p>
              </>
            )}
          </div>

          {/* Preview table */}
          {bulkRecords.length > 0 && (
            <div className="mt-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Badge
                  variant="outline"
                  className="text-[10px] bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                >
                  {bulkRecords.length} record
                  {bulkRecords.length !== 1 ? "s" : ""} parsed
                  {bulkRecords.length > visibleCount && (
                    <span className="ml-1 text-muted-foreground">
                      (showing {Math.min(visibleCount, bulkRecords.length)})
                    </span>
                  )}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkRecords([])
                    setFileName(null)
                    setVisibleCount(100)
                    if (fileInputRef.current)
                      fileInputRef.current.value = ""
                  }}
                  className="h-6 gap-1 border-white/20 bg-white/10 text-[10px] dark:border-white/10 dark:bg-black/20"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>

              <div className="flex-1 overflow-auto rounded-lg border border-white/15 dark:border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/15 dark:border-white/10 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-background/95 [&>th]:backdrop-blur-sm">
                      <TableHead className="w-8 text-[10px]">#</TableHead>
                      <TableHead className="text-[10px] min-w-[90px]">Part #</TableHead>
                      <TableHead className="text-[10px] min-w-[120px]">Part Name</TableHead>
                      <TableHead className="text-[10px] min-w-[80px]">Category</TableHead>
                      <TableHead className="text-[10px] min-w-[80px]">Brand</TableHead>
                      <TableHead className="text-[10px] min-w-[120px]">Compatible</TableHead>
                      <TableHead className="text-[10px] min-w-[140px]">Description</TableHead>
                      <TableHead className="text-[10px] min-w-[60px]">Price</TableHead>
                      <TableHead className="text-[10px] min-w-[50px]">Stock</TableHead>
                      <TableHead className="text-[10px] min-w-[50px]">Image</TableHead>
                      <TableHead className="text-[10px] min-w-[50px]">Video</TableHead>
                      <TableHead className="text-[10px] min-w-[50px]">Active</TableHead>
                      <TableHead className="w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRecords.slice(0, visibleCount).map((rec, i) => (
                      <TableRow
                        key={i}
                        className={cn(
                          "border-white/10 dark:border-white/5 h-9",
                          (!rec.part_number || !rec.part_name) &&
                            "bg-red-500/10"
                        )}
                      >
                        <TableCell className="text-[10px] text-muted-foreground py-1">
                          {i + 1}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] py-1">
                          {rec.part_number || (
                            <span className="text-red-400">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] py-1">
                          {rec.part_name || (
                            <span className="text-red-400">Missing</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[10px] py-1">
                          {rec.category || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1">
                          {rec.brand || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1 max-w-[140px] truncate" title={rec.compatible_vehicles}>
                          {rec.compatible_vehicles || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1 max-w-[160px] truncate" title={rec.description}>
                          {rec.description || "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1">
                          {rec.price !== "" ? `$${rec.price}` : "—"}
                        </TableCell>
                        <TableCell className="text-[10px] py-1">
                          {rec.stock_quantity !== ""
                            ? rec.stock_quantity
                            : "—"}
                        </TableCell>
                        {/* Image thumbnail */}
                        <TableCell className="py-1">
                          {rec.image_url ? (
                            <button
                              type="button"
                              onClick={() => setPreviewImage(rec.image_url)}
                              className="group relative h-7 w-7 flex-shrink-0 rounded overflow-hidden border border-white/15 dark:border-white/10 hover:border-indigo-400/50 transition-colors cursor-pointer"
                              title="Click to preview"
                            >
                              <img
                                src={rec.image_url}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                                }}
                              />
                              <div className="hidden h-full w-full items-center justify-center bg-white/5">
                                <ImageIcon className="h-3 w-3 text-muted-foreground" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {/* Video thumbnail */}
                        <TableCell className="py-1">
                          {rec.video_url ? (
                            <a
                              href={rec.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-white/15 dark:border-white/10 bg-white/5 dark:bg-black/20 hover:border-indigo-400/50 transition-colors"
                              title={rec.video_url}
                            >
                              <Play className="h-3 w-3 text-indigo-400" />
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {/* Active status */}
                        <TableCell className="text-[10px] py-1">
                          <span className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            rec.is_active ? "bg-emerald-500" : "bg-red-400"
                          )} />
                        </TableCell>
                        <TableCell className="py-1">
                          <button
                            onClick={() => removeBulkRecord(i)}
                            className="rounded-full p-0.5 hover:bg-red-500/20 transition-colors"
                          >
                            <X className="h-3 w-3 text-red-400" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {bulkRecords.length > visibleCount && (
                <div className="p-2 flex items-center justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVisibleCount((prev) => prev + 100)}
                    className="h-7 gap-1.5 border-white/20 bg-white/10 text-[10px] dark:border-white/10 dark:bg-black/20 hover:border-indigo-400/40"
                  >
                    <ChevronDown className="h-3 w-3" />
                    Load next 100 ({Math.min(100, bulkRecords.length - visibleCount)} more)
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── Fullscreen Image Preview Lightbox ──── */}
          <AnimatePresence>
            {previewImage && (
              <motion.div
                key="lightbox-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md cursor-pointer"
                onClick={() => setPreviewImage(null)}
              >
                <motion.div
                  key="lightbox-content"
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
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="max-w-full max-h-[85vh] rounded-xl border border-white/10 shadow-2xl object-contain"
                    onError={() => {
                      toast.error("Failed to load image")
                      setPreviewImage(null)
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bulk Submit */}
          <div className="mt-4 flex justify-end gap-2 pb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="border-white/20 bg-white/10 dark:border-white/10 dark:bg-black/20"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleBulkSubmit}
              disabled={submitting || bulkRecords.length === 0}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-purple-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-3.5 w-3.5" />
                  Upload{" "}
                  {bulkRecords.length > 0
                    ? `${bulkRecords.length} Records`
                    : ""}
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AnimatedModal>
  )
}
