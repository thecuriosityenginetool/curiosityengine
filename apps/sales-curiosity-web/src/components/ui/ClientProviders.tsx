"use client";

import { ToastProvider } from "./ToastProvider";
import { CommandPaletteProvider } from "./CommandPalette";
// import PaletteFAB from "./PaletteFAB"; // Removed - not needed for sales-focused app

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <CommandPaletteProvider>
        {children}
        {/* <PaletteFAB /> - Removed floating menu button */}
      </CommandPaletteProvider>
    </ToastProvider>
  );
}


