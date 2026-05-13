"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function ClerkProviderWrapper({
  children,
  publishableKey,
}: {
  children: React.ReactNode;
  publishableKey: string;
}) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      appearance={{
        elements: {
          rootBox: "w-full",
        },
        variables: {
          colorPrimary: "#ea580c", // Orange brand color
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
