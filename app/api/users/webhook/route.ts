import { query } from "@/db";
// import { users } from "@/db/schemas/usersSchema";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";

// export async function GET(req: NextRequest) {
//   try {
//     return new Response("Webhook received TEST GET call", { status: 200 });
//   } catch (err) {
//     console.error("Error verifying webhook:", err);
//     return new Response("Error verifying webhook", { status: 400 });
//   }
// }

// export async function GET(req: NextRequest) {
//   // Simple test response to confirm route is live
//   console.log("Webhook GET called");
//   return NextResponse.json(
//     { message: "Webhook endpoint is reachable" },
//     { status: 200 },
//   );
// }

export async function POST(req: NextRequest) {
    try {
        const evt = await verifyWebhook(req, {
            signingSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET,
        });

        // Do something with payload
        // For this guide, log payload to console
        const { id } = evt.data;
        const eventType = evt.type;
        console.log(
            `Received webhook with ID ${id} and event type of ${eventType}`,
        );
        console.log("Webhook payload:", evt.data);

        if (eventType === "user.created") {
            const { id, first_name, last_name, image_url, email_addresses, primary_email_address_id } = evt?.data ?? "";
            const primaryEmail = email_addresses.find((e) => e?.id === primary_email_address_id)?.email_address
                ?? email_addresses[0]?.email_address;

            console.log(
                evt.data,
                "✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅",
            );
            // await insert(users).values({
            //     clerkId: id,
            //     name: `${first_name} ${last_name}`,
            //     imageUrl: image_url,
            // });
            await query(
                `INSERT INTO users (clerk_id, name, email, image_url, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                ON CONFLICT (clerk_id) DO NOTHING`,
                [id, `${first_name} ${last_name}`, primaryEmail, image_url]
            );
            console.log(`User created: ${id}`);
        }

        if (eventType === "user.deleted") {
            const { id } = evt.data;

            if (!id) {
                return new Response("Missing user id", { status: 400 });
            }

            // await delete(users).where(eq(users.clerkId, id));

            await query(
                `DELETE FROM users WHERE clerk_id = $1`,
                [id]
            );
            console.log(`User deleted: ${id}`);
        }

        if (eventType === "user.updated") {
            const { id, first_name, last_name, image_url, } = evt?.data ?? "";
            // const primaryEmail = email_addresses.find((e) => e?.primary)?.email_address
            //     ?? email_addresses[0]?.email_address;

            if (!id) {
                return new Response("Missing user id", { status: 400 });
            }

            // await db
            //     .update(users)
            //     .set({
            //         name: `${first_name} ${last_name}`,
            //         imageUrl: image_url,
            //     })
            //     .where(eq(users.clerkId, id));
            await query(
                `UPDATE users
                SET name = $2, image_url = $3, updated_at = NOW()
                WHERE clerk_id = $1`,
                [id, `${first_name} ${last_name}`, image_url]
            );
            console.log(`User updated: ${id}`);
        }

        return new Response("Webhook received", { status: 200 });
    } catch (err) {
        console.error("Error verifying webhook:", err);
        return new Response("Error verifying webhook", { status: 400 });
    }
}
