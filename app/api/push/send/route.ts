import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
  // Auth: require a secret token for push broadcasts
  const authHeader = request.headers.get("authorization");
  const expected = process.env.PUSH_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    initWebPush();
    const { title, body } = await request.json();

    // Validate input
    const safeTitle = typeof title === "string" ? title.slice(0, 100) : "ICE Alert";
    const safeBody = typeof body === "string" ? body.slice(0, 500) : "New ICE sighting reported nearby";

    const supabase = getSupabase();

    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("subscription");

    if (!subscriptions?.length) {
      return NextResponse.json({ sent: 0 });
    }

    const payload = JSON.stringify({
      title: safeTitle,
      body: safeBody,
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
