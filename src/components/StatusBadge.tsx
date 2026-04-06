import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  "Disponible": "badge-available",
  "Reservado": "badge-reserved",
  "Vendido": "badge-sold",
  "Alquilado": "badge-rented",
  "Nuevo": "badge-new",
  "Contactado": "badge-contacted",
  "Visita Agendada": "badge-visit",
  "Oferta Realizada": "badge-offer",
  "Cerrado Ganado": "badge-won",
  "Cerrado Perdido": "badge-lost",
  "Confirmada": "badge-available",
  "Pendiente": "badge-reserved",
  "Completada": "badge-sold",
  "Cancelada": "badge-lost",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      statusStyles[status] || "bg-muted text-muted-foreground",
      className
    )}>
      {status}
    </span>
  );
}
