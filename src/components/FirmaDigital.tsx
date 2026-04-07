import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { FileSignature, Trash2, Download, Loader2 } from "lucide-react";

interface FirmaDigitalProps {
  open: boolean;
  onClose: () => void;
  leadName: string;
  propertyTitle: string;
  propertyAddress?: string;
  agentName: string;
}

export function FirmaDigital({ open, onClose, leadName, propertyTitle, propertyAddress, agentName }: FirmaDigitalProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [generating, setGenerating] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleGenerate = async () => {
    if (sigRef.current?.isEmpty()) {
      toast.error("Por favor, firmá antes de generar el documento");
      return;
    }

    setGenerating(true);
    try {
      const sigDataUrl = sigRef.current!.toDataURL("image/png");
      const today = new Date().toLocaleDateString("es-AR", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = pdf.internal.pageSize.getWidth();
      const margin = 20;

      // Header bar
      pdf.setFillColor(15, 41, 66); // #0F2942
      pdf.rect(0, 0, W, 22, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("InmoGestión — CRM Inmobiliario", margin, 14);

      // Title
      pdf.setTextColor(15, 41, 66);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("Constancia de intención de operación", margin, 38);

      // Divider
      pdf.setDrawColor(26, 127, 168); // #1A7FA8
      pdf.setLineWidth(0.5);
      pdf.line(margin, 42, W - margin, 42);

      // Details
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(60, 60, 60);

      const lines = [
        ["Fecha:", today],
        ["Cliente:", leadName],
        ["Agente:", agentName],
        ["Propiedad:", propertyTitle],
        ...(propertyAddress ? [["Dirección:", propertyAddress]] : []),
      ];

      let y = 52;
      for (const [label, value] of lines) {
        pdf.setFont("helvetica", "bold");
        pdf.text(label, margin, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(value, margin + 28, y);
        y += 8;
      }

      // Body text
      y += 4;
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const body = pdf.splitTextToSize(
        `Por medio del presente documento, el cliente ${leadName} manifiesta su intención de avanzar en la operación inmobiliaria respecto a la propiedad indicada arriba, gestionada por el agente ${agentName} a través de InmoGestión. Este documento tiene carácter informativo y no constituye un contrato vinculante.`,
        W - margin * 2
      );
      pdf.text(body, margin, y);
      y += body.length * 5 + 12;

      // Signature area
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, W / 2 - margin - 5, 35);

      // Embed signature image
      pdf.addImage(sigDataUrl, "PNG", margin + 2, y + 2, W / 2 - margin - 9, 31);

      // Signature label
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.setFont("helvetica", "normal");
      pdf.text("Firma del cliente", margin + 2, y + 40);

      // Footer
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.setFontSize(7);
      pdf.setTextColor(160, 160, 160);
      pdf.text(
        `Generado por InmoGestión el ${new Date().toLocaleString("es-AR")}`,
        margin,
        pageH - 10
      );

      const filename = `firma_${leadName.replace(/\s+/g, "_")}_${Date.now()}.pdf`;
      pdf.save(filename);
      toast.success("Documento generado y descargado");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Firma digital
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Cliente:</span> {leadName}</p>
            <p><span className="font-medium text-foreground">Propiedad:</span> {propertyTitle}</p>
          </div>

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Firmar en el área de abajo:</p>
            <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigRef}
                penColor="#0F2942"
                canvasProps={{ width: 480, height: 160, className: "w-full touch-none" }}
                onEnd={() => setIsEmpty(false)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Usá el mouse o el dedo (táctil) para firmar
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={isEmpty} className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />Limpiar
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              className="bg-primary text-primary-foreground gap-1.5"
              onClick={handleGenerate}
              disabled={generating || isEmpty}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Generar PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
