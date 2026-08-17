import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Issues a LiveKit room token for a real booking.
 *
 * SECURITY: this route used to accept an arbitrary `room`/`username` pair
 * from the query string with no auth check, letting anyone mint a valid
 * token for any room under any identity. It now requires a signed-in
 * Supabase session and derives the room + identity from a real `sessions`
 * row, relying on RLS (a participant-only SELECT policy) to reject requests
 * for sessions the caller isn't part of.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing "sessionId" query parameter' },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // RLS restricts this to sessions where the caller is client_id or
  // expert_id, so a non-participant simply gets no row back (not a leak).
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id, title, client_id, expert_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json(
      { error: "Session not found or you are not a participant" },
      { status: 404 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const roomName = `SOS-Session-${sessionId.replace(/-/g, "")}`;

  if (!apiKey || !apiSecret) {
    console.warn("LiveKit API credentials missing. Returning mock room token.");
    return NextResponse.json({
      token: `mock_token_${Date.now()}`,
      room: roomName,
      identity: user.id,
    });
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.id,
      name: profile?.full_name || user.email || "User",
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    return NextResponse.json({ token, room: roomName });
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
