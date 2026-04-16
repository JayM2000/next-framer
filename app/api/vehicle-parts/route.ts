import { query } from "@/db";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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
    const body = await request.json();

    // Validate required fields
    if (!body.part_number || !body.part_name) {
      return NextResponse.json(
        { error: "part_number and part_name are required" },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO vehicle_parts
         (part_number, part_name, category, brand, compatible_vehicles,
          description, price, stock_quantity, image_url, video_url, is_active, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        body.part_number,
        body.part_name,
        body.category || null,
        body.brand || null,
        body.compatible_vehicles || null,
        body.description || null,
        body.price != null ? Number(body.price) : null,
        body.stock_quantity != null ? Number(body.stock_quantity) : 0,
        body.image_url || null,
        body.video_url || null,
        body.is_active !== undefined ? body.is_active : true,
        userId,
      ]
    );

    return NextResponse.json({ data: result[0] }, { status: 201 });
  } catch (error: unknown) {
    console.error("POST /api/vehicle-parts error:", error);

    // Handle unique constraint violation on part_number
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        { error: "A part with this part number already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
