import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const PLACE_CATEGORIES = [
  { id: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { id: "cafe", label: "Cafe", emoji: "☕" },
  { id: "hawker", label: "Hawker", emoji: "🥡" },
  { id: "halal", label: "Halal", emoji: "🌙" },
  { id: "vegetarian", label: "Vegetarian", emoji: "🥗" },
  { id: "bar", label: "Bar", emoji: "🍺" },
  { id: "japanese", label: "Japanese", emoji: "🍣" },
  { id: "korean", label: "Korean", emoji: "🍜" },
  { id: "chinese", label: "Chinese", emoji: "🥟" },
  { id: "indian", label: "Indian", emoji: "🍛" },
  { id: "western", label: "Western", emoji: "🍔" },
  { id: "thai", label: "Thai", emoji: "🍲" },
  { id: "mrt", label: "MRT Station", emoji: "🚇" },
  { id: "park", label: "Park", emoji: "🌳" },
  { id: "mall", label: "Mall", emoji: "🛍️" },
] as const;

export type CategoryId = (typeof PLACE_CATEGORIES)[number]["id"];

interface CategoryFilterProps {
  selected: CategoryId[];
  onChange: (selected: CategoryId[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  const toggle = (id: CategoryId) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PLACE_CATEGORIES.map((cat) => {
        const isSelected = selected.includes(cat.id);
        return (
          <Badge
            key={cat.id}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all font-display text-sm px-3 py-1.5 select-none",
              isSelected
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "hover:bg-muted"
            )}
            onClick={() => toggle(cat.id)}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.label}
          </Badge>
        );
      })}
    </div>
  );
}
