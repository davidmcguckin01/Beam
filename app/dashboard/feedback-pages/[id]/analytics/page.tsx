"use client";
import { useParams } from "next/navigation";

import { FormAnalyticsView } from "@/components/analytics/form-analytics-view";

export default function FormAnalyticsPage() {
  const params = useParams();
  const id = params?.id as string;
  return (
    <FormAnalyticsView pageId={id} />
  );
}
