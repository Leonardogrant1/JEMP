import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      app_slug,
      name,
      email,
      phone,
      country,
      social_accounts,
      video_link,
      description,
    } = body;

    // Validation
    if (app_slug !== "jemp") {
      return NextResponse.json({ error: "Invalid app_slug" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || phone.trim() === "") {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    if (!country || typeof country !== "string" || country.trim() === "") {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    if (
      !social_accounts ||
      !Array.isArray(social_accounts) ||
      social_accounts.length === 0 ||
      social_accounts.some((acc) => typeof acc !== "string" || acc.trim() === "")
    ) {
      return NextResponse.json(
        { error: "At least one social account handle is required" },
        { status: 400 }
      );
    }

    if (!video_link || typeof video_link !== "string" || !video_link.startsWith("http")) {
      return NextResponse.json(
        { error: "Valid portfolio or sample video link is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string" || description.trim() === "") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }

    let targetHost = process.env.NORTHBYTE_ENDPOINT || "";
    console.log("targetHost", targetHost);
    if (!targetHost) {
      console.error("NORTHBYTE_ENDPOINT environment variable is not defined.");
      return NextResponse.json(
        { error: "Endpoint configuration error" },
        { status: 500 }
      );
    }

    // Standardize URL formatting
    let targetUrl = targetHost;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1")
        ? `http://${targetUrl}`
        : `https://${targetUrl}`;
    }

    if (!targetUrl.includes("/api/creator-applications")) {
      targetUrl = targetUrl.replace(/\/$/, "") + "/api/creator-applications";
    }

    console.log(`Forwarding creator application payload to ${targetUrl}`);

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        app_slug,
        name,
        email,
        phone,
        country,
        social_accounts,
        video_link,
        description,
      }),
    });

    if (!res.ok) {
      let errorMsg = "Failed to forward request to external endpoint";
      try {
        const errorBody = await res.json();
        if (errorBody && errorBody.error) {
          errorMsg = errorBody.error;
        } else if (errorBody && errorBody.message) {
          errorMsg = errorBody.message;
        }
      } catch (_) {
        // Fallback to text
        try {
          const text = await res.text();
          if (text) errorMsg = text;
        } catch (_) { }
      }

      console.error(`Endpoint responded with status ${res.status}: ${errorMsg}`);
      return NextResponse.json({ error: errorMsg }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error in creator-application route:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
