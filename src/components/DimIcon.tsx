import { Bike, Car, Droplets, ShoppingBag, Sprout, Zap, type LucideProps } from "lucide-react";
import type { Category } from "@/lib/questions";
import type { DimId } from "@/lib/scoring";
import { DIM_META } from "@/lib/theme";

const MAP = { Sprout, Bike, Car, Zap, ShoppingBag, Droplets };

export function DimIcon({ name, ...props }: { name: Category["icon"] } & LucideProps) {
  const Icon = MAP[name];
  return <Icon aria-hidden {...props} />;
}

/** Ícone + cor fixos de cada dimensão (mesma identidade em todo o sistema). */
export function DimGlyph({ dim, ...props }: { dim: DimId } & LucideProps) {
  const Icon = MAP[DIM_META[dim].icon];
  return <Icon aria-hidden color={DIM_META[dim].color} {...props} />;
}
