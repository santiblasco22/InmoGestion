import { useState, useRef } from "react";
import Papa from "papaparse";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { leadsApi } from "@/lib/api";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";

interface ParsedRow {
  name: string; email?: string; phone?: string;
  budget?: number; source?: string; stage?: string;
}

interface ImportLeadsDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

const TEMPLATE_CSV = `name,email,phone,budget,source,stage
Juan Pérez,juan@email.com,1112345678,50000000,WEB,NUEVO
María García,,1198765432,,WHATSAPP,CONTACTADO`;

export function ImportLeadsDialog({ open, onClose, onImported }: ImportLeadsDialogProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = (file: File) => {
    if (!file.name.endsWith(".csv") && !file.type.includes("csv")) {
      toast.error("Solo se aceptan archivos CSV");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed: ParsedRow[] = [];
        const errs: string[] = [];
        data.forEach((row, i) => {
          const name = (row.name ?? row.nombre ?? row.Name ?? "").trim();
          if (!name) { errs.push(`Fila ${i + 2}: falta el nombre`); return; }
          parsed.push({
            name,
            email: row.email?.trim() || undefined,
            phone: row.phone?.trim() || row.telefono?.trim() || undefined,
            budget: row.budget ? Number(row.budget) || undefined : undefined,
            source: row.source?.toUpperCase() || row.fuente?.toUpperCase() || "OTRO",
            stage: row.stage?.toUpperCase() || row.etapa?.toUpperCase() || "NUEVO",
          });
        });
        setRows(parsed);
        setErrors(errs);
      },
      error: () => toast.error("No se pudo leer el archivo"),
    });
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setRows([]);
    setErrors([]);
    parseFile(file);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    try {
      const result = await leadsApi.import(rows);
      toast.success(`${result.created} leads importados${result.skipped ? `, ${result.skipped} omitidos` : ""}`);
      onImported();
      handleClose();
    } catch {
      toast.error("Error al importar. Revisá el formato del archivo.");
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setErrors([]);
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla_leads.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />Importar leads desde CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <div className="flex items-center justify-between rounded-lg bg-muted/40 border px-4 py-3">
            <div>
              <p className="text-xs font-medium">¿Primera vez?</p>
              <p className="text-[11px] text-muted-foreground">Descargá la plantilla con el formato correcto</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" />Plantilla
            </Button>
          </div>

          {/* Drop zone */}
          {rows.length === 0 && (
            <label
              className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Arrastrá tu CSV o hacé click</p>
                <p className="text-xs text-muted-foreground mt-0.5">Columnas: name, email, phone, budget, source, stage</p>
              </div>
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />{errors.length} filas con problemas (serán omitidas)
              </p>
              {errors.slice(0, 3).map((e, i) => <p key={i} className="text-[11px] text-amber-600">{e}</p>)}
              {errors.length > 3 && <p className="text-[11px] text-amber-600">+{errors.length - 3} más...</p>}
            </div>
          )}

          {/* Preview */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-700">{rows.length} leads listos para importar</p>
                <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => { setRows([]); setErrors([]); }}>
                  Cambiar archivo
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/30 border-b text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nombre</th>
                    <th className="px-3 py-2 text-left font-medium">Email / Teléfono</th>
                    <th className="px-3 py-2 text-left font-medium">Fuente</th>
                    <th className="px-3 py-2 text-left font-medium">Etapa</th>
                  </tr></thead>
                  <tbody>
                    {rows.slice(0, 6).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{r.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[140px]">{r.email ?? r.phone ?? "—"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.source ?? "OTRO"}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">{r.stage ?? "NUEVO"}</td>
                      </tr>
                    ))}
                    {rows.length > 6 && (
                      <tr><td colSpan={4} className="px-3 py-1.5 text-muted-foreground text-center">+{rows.length - 6} más...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button
            className="bg-primary text-primary-foreground gap-1.5"
            onClick={handleImport}
            disabled={rows.length === 0 || importing}
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar {rows.length > 0 ? `${rows.length} leads` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
