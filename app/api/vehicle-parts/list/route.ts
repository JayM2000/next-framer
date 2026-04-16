import { query } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Look up internal user_id from clerk_id
    const users = await query<{ id: number }>(
      `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
      [clerkUserId]
    );

    if (!users.length) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = users[0].id;

    const parts = await query(
      `SELECT id, part_number, part_name, category, brand, compatible_vehicles,
              description, price, stock_quantity, image_url, video_url, is_active,
              created_at, updated_at
       FROM vehicle_parts
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ data: parts });
  } catch (error) {
    console.error("GET /api/vehicle-parts/list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
