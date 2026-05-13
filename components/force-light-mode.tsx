"use client";

import { useEffect } from "react";

export function ForceLightMode() {
  useEffect(() => {
    // Force light mode by removing dark class from html
    const html = document.documentElement;
    html.classList.remove("dark");
    html.classList.add("light");
    
    // Also set data-theme attribute
    html.setAttribute("data-theme", "light");
    
    // Prevent dark mode from being applied
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          if (html.classList.contains("dark")) {
            html.classList.remove("dark");
            html.classList.add("light");
          }
        }
      });
    });
    
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });
    
    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}




