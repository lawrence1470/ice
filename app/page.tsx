"use client";

import { useEffect } from "react";
import Map from "@/components/Map";
import ReportButton from "@/components/ReportButton";
import { registerPushSubscription } from "@/lib/push";

export default function Home() {
  useEffect(() => {
    registerPushSubscription();
  }, []);

  return (
    <div className="relative h-dvh w-full">
      <Map />
      <ReportButton />
    </div>
  );
}
