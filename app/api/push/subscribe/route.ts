import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    // Validate push subscription structure
    if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = getSupabase();

    const { error } = await supabase.from("push_subscriptions").insert({
      subscription: JSON.stringify(subscription),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
