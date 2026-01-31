"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import ReportButton from "@/components/ReportButton";
import Header from "@/components/Header";
import { registerPushSubscription } from "@/lib/push";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  useEffect(() => {
    registerPushSubscription();
  }, []);

  return (
    <div className="relative h-dvh w-full">
      <Header />
      <Map />
      <ReportButton />
    </div>
  );
}
