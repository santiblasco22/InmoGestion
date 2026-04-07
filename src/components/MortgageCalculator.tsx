import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calculator, TrendingDown } from "lucide-react";

interface MortgageCalculatorProps {
  open: boolean;
  onClose: () => void;
  defaultPrice?: number;
  currency?: string;
}

function fmt(n: number, currency: string) {
  if (currency === "USD") return `USD ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function MortgageCalculator({ open, onClose, defaultPrice = 0, currency = "ARS" }: MortgageCalculatorProps) {
  const [price, setPrice] = useState(String(defaultPrice || ""));
  const [downPct, setDownPct] = useState("30");
  const [years, setYears] = useState("20");
  const [rate, setRate] = useState(currency === "USD" ? "6" : "85");
  const [cur, setCur] = useState(currency);

  const P = Number(price) || 0;
  const down = (P * Number(downPct)) / 100;
  const principal = P - down;
  const r = Number(rate) / 100 / 12;
  const n = Number(years) * 12;

  let monthly = 0;
  if (r > 0 && n > 0 && principal > 0) {
    monthly = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  } else if (r === 0 && n > 0 && principal > 0) {
    monthly = principal / n;
  }

  const totalPaid = monthly * n;
  const totalInterest = totalPaid - principal;
  const hasResult = monthly > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Calculadora de cuota hipotecaria
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Precio de la propiedad</Label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="50000000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Moneda</Label>
                <Select value={cur} onValueChange={(v) => { setCur(v); setRate(v === "USD" ? "6" : "85"); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Anticipo (%)</Label>
              <Select value={downPct} onValueChange={setDownPct}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["10","20","25","30","40","50"].map((v) => (
                    <SelectItem key={v} value={v}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Plazo (años)</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["5","10","15","20","25","30"].map((v) => (
                    <SelectItem key={v} value={v}>{v} años</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Tasa de interés anual (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="mt-1"
              />
              {cur === "ARS" && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Referencia: Hipotecario UVA ~{rate}% TNA + ajuste inflación
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Results */}
          {P > 0 && (
            <div className="space-y-3">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-center">
                <p className="text-xs text-muted-foreground">Cuota mensual estimada</p>
                <p className="text-3xl font-bold text-primary mt-1">
                  {hasResult ? fmt(monthly, cur) : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  durante {years} años ({n} cuotas)
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-muted-foreground">Anticipo</p>
                  <p className="font-semibold mt-0.5">{fmt(down, cur)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-muted-foreground">Capital</p>
                  <p className="font-semibold mt-0.5">{fmt(principal, cur)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-2.5">
                  <p className="text-muted-foreground">Total intereses</p>
                  <p className="font-semibold mt-0.5 text-amber-600">{hasResult ? fmt(totalInterest, cur) : "—"}</p>
                </div>
              </div>

              {hasResult && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <TrendingDown className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-700">
                    Total a pagar: <strong>{fmt(totalPaid, cur)}</strong> — pagás <strong>{fmt(totalInterest, cur)}</strong> en intereses ({((totalInterest / principal) * 100).toFixed(0)}% sobre el capital).
                  </p>
                </div>
              )}
            </div>
          )}

          {!P && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Ingresá el precio de la propiedad para calcular
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
