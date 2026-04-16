import { query, withTransaction } from "@/db";
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

    if (!Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: "records must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate each record has required fields
    for (let i = 0; i < body.records.length; i++) {
      const rec = body.records[i];
      if (!rec.part_number || !rec.part_name) {
        return NextResponse.json(
          {
            error: `Record at index ${i} is missing required fields (part_number, part_name)`,
          },
          { status: 400 }
        );
      }
    }

    // Use transaction for atomic bulk insert
    const insertedCount = await withTransaction(async (client) => {
      let count = 0;
      for (const rec of body.records) {
        await client.query(
          `INSERT INTO vehicle_parts
             (part_number, part_name, category, brand, compatible_vehicles,
              description, price, stock_quantity, image_url, video_url, is_active, user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            rec.part_number,
            rec.part_name,
            rec.category || null,
            rec.brand || null,
            rec.compatible_vehicles || null,
            rec.description || null,
            rec.price != null ? Number(rec.price) : null,
            rec.stock_quantity != null ? Number(rec.stock_quantity) : 0,
            rec.image_url || null,
            rec.video_url || null,
            rec.is_active !== undefined ? rec.is_active : true,
            userId,
          ]
        );
        count++;
      }
      return count;
    });

    return NextResponse.json(
      { message: `Successfully inserted ${insertedCount} records`, count: insertedCount },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("POST /api/vehicle-parts/bulk error:", error);

    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      return NextResponse.json(
        {
          error:
            "Bulk insert failed: duplicate part_number found. No records were inserted (transaction rolled back).",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
