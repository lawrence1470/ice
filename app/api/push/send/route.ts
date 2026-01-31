import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function initWebPush() {
  webpush.setVapidDetails(
    "mailto:alerts@ice-alert.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
}

export async function POST(request: Request) {
  try {
    initWebPush();
    const { title, body } = await request.json();
    const supabase = getSupabase();

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({
      title: title || "ICE Alert",
      body: body || "New ICE sighting reported nearby",
    });

    const results = await Promise.allSettled(
      subscriptions.map((row) =>
        webpush.sendNotification(JSON.parse(row.subscription as string), payload)
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch {
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
