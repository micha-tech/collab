"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-surface group-[.toaster]:text-foreground group-[.toaster]:border-border-line group-[.toaster]:shadow-lg",
          title: "text-sm font-medium",
          description: "text-sm text-muted",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };