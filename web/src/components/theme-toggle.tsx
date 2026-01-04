"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icon";
import { useTheme } from "@/providers/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      className="text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <Icon name={theme === "dark" ? "tabler:sun" : "tabler:moon"} className="h-4 w-4" />
    </Button>
  );
}
