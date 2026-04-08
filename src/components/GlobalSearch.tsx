import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Users, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAppStore } from "@/store/useAppStore";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const leads = useAppStore((s) => s.leads);
  const properties = useAppStore((s) => s.properties);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleLead = (id: string) => {
    setOpen(false);
    navigate("/leads", { state: { openLeadId: id } });
  };

  const handleProperty = (id: string) => {
    setOpen(false);
    navigate("/propiedades", { state: { openPropertyId: id } });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar leads, propiedades..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>

          <CommandGroup heading="Leads">
            {leads.slice(0, 20).map((lead) => (
              <CommandItem key={lead.id} value={`lead-${lead.name}-${lead.email}`} onSelect={() => handleLead(lead.id)}>
                <Users className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{lead.name}</span>
                {lead.email && <span className="ml-2 text-xs text-muted-foreground truncate">{lead.email}</span>}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Propiedades">
            {properties.slice(0, 20).map((prop) => (
              <CommandItem key={prop.id} value={`prop-${prop.title}-${prop.address}`} onSelect={() => handleProperty(prop.id)}>
                <Building2 className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{prop.title}</span>
                <span className="ml-2 text-xs text-muted-foreground truncate">{prop.address}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
