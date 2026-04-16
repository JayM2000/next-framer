import { query, withTransaction } from "@/db";
import { createTRPCRouter, protectedProcedure } from "../init";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const vehiclesPartsRouter = createTRPCRouter({
  getVehiclePartByUserId: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx?.clerkUserId ?? null;
    if (!userId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    const parts = await query(
      `SELECT *
           FROM vehicle_parts
           WHERE user_id = $1
           ORDER BY created_at DESC`,
      [userId]
    );

    return parts;
  }),
  getAllVehicleParts: protectedProcedure.query(async () => {

    // throw new TRPCError({
    //   code: "INTERNAL_SERVER_ERROR",
    //   message: "Something went wrong",
    // });

    const parts = await query(
      `SELECT *
          FROM vehicle_parts
          ORDER BY created_at DESC`);

    return parts;
  }),

  getPaginatedVehicleParts: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(500).default(100),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search } = input;
      const offset = (page - 1) * pageSize;

      // Build WHERE clause for search
      let whereClause = "";
      const params: unknown[] = [];

      if (search && search.trim().length > 0) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = `WHERE (
          part_name ILIKE $1 OR
          brand ILIKE $1 OR
          category ILIKE $1 OR
          part_number ILIKE $1 OR
          compatible_vehicles ILIKE $1 OR
          description ILIKE $1
        )`;
        params.push(searchTerm);
      }

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM vehicle_parts ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult[0]?.count ?? "0", 10);

      // Get paginated data
      const paramOffset = params.length;
      const data = await query(
        `SELECT * FROM vehicle_parts ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
        [...params, pageSize, offset]
      );

      return {
        data,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }),

  getInfiniteVehicleParts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(500).default(100),
        cursor: z.number().nullish(), // offset cursor
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, search } = input;
      const cursor = input.cursor ?? 0;

      // Build WHERE clause for search
      let whereClause = "";
      const params: unknown[] = [];

      if (search && search.trim().length > 0) {
        const searchTerm = `%${search.trim()}%`;
        whereClause = `WHERE (
          part_name ILIKE $1 OR
          brand ILIKE $1 OR
          category ILIKE $1 OR
          part_number ILIKE $1 OR
          compatible_vehicles ILIKE $1 OR
          description ILIKE $1
        )`;
        params.push(searchTerm);
      }

      // Get total count
      const countResult = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM vehicle_parts ${whereClause}`,
        params
      );
      const totalCount = parseInt(countResult[0]?.count ?? "0", 10);

      // Get data at cursor offset
      const paramOffset = params.length;
      const items = await query(
        `SELECT * FROM vehicle_parts ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
        [...params, limit, cursor]
      );

      // Determine next cursor
      const nextOffset = cursor + items.length;
      const nextCursor = nextOffset < totalCount ? nextOffset : undefined;

      return {
        items,
        totalCount,
        nextCursor,
      };
    }),

  insertIntoVehicleParts: protectedProcedure.input(
    z.union([
      z.object({
        part_number: z.string().nonempty("Part number is mandatory"),
        part_name: z.string().nonempty("Part name is mandatory"),
        category: z.string(),
        brand: z.string(),
        compatible_vehicles: z.string(),
        description: z.string(),
        price: z.number(),
        stock_quantity: z.number().default(0),
        image_url: z.string(),
        video_url: z.string(),
        is_active: z.boolean().default(true),
      }),
      z.object({
        records: z.array(z.object({
          part_number: z.string().nonempty("Part number is mandatory"),
          part_name: z.string().nonempty("Part name is mandatory"),
          category: z.string(),
          brand: z.string(),
          compatible_vehicles: z.string(),
          description: z.string(),
          price: z.number(),
          stock_quantity: z.number().default(0),
          image_url: z.string(),
          video_url: z.string(),
          is_active: z.boolean().default(true),
        })
        )
      }),

    ]
    )
  ).mutation(async ({ ctx, input }) => {
    const clerkUserId = ctx?.clerkUserId ?? null;
    if (!clerkUserId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Unauthorized",
      });
    }

    // Look up internal user_id from clerk_id
    const users = await query<{ id: number }>(
      `SELECT id FROM users WHERE clerk_id = $1 LIMIT 1`,
      [clerkUserId]
    );

    if (!users.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // ── Bulk insert (input has a `records` array) ──
    if ('records' in input) {

      if (!Array.isArray(input.records) || input.records.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "records must be a non-empty array",
        });
      }

      // Validate each record has required fields
      for (let i = 0; i < input.records.length; i++) {
        const rec = input.records[i];
        if (!rec.part_number || !rec.part_name) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Record at index ${i} is missing required fields (part_number, part_name)`,
          });
        }
      }

      // Use transaction for atomic bulk insert
      const insertedCount = await withTransaction(async (client) => {
        let count = 0;
        for (const rec of input.records) {
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
              users[0].id,
            ]
          );
          count++;
        }
        return count;
      });

      return { message: `Successfully inserted ${insertedCount} records`, count: insertedCount };
    }

    // ── Single insert (input is a flat object) ──
    const parts = await query(
      `INSERT INTO vehicle_parts
           (part_number, part_name, category, brand, compatible_vehicles,
            description, price, stock_quantity, image_url, video_url, is_active, user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
      [
        input.part_number,
        input.part_name,
        input.category || null,
        input.brand || null,
        input.compatible_vehicles || null,
        input.description || null,
        input.price != null ? Number(input.price) : null,
        input.stock_quantity != null ? Number(input.stock_quantity) : 0,
        input.image_url || null,
        input.video_url || null,
        input.is_active !== undefined ? input.is_active : true,
        users[0].id,
      ]
    );

    return parts;
  }),

});
