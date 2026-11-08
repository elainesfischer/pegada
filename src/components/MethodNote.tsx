import { METHOD_NOTE } from "@/lib/feedback";

export function MethodNote({ light = false }: { light?: boolean }) {
  return (
    <p className={`text-xs leading-relaxed ${light ? "text-white/70" : "text-floresta/70"}`}>
      <strong>Índice educativo de Pegada Ecológica.</strong> {METHOD_NOTE}
    </p>
  );
}
