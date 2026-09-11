import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { connectToDatabase } from "@/lib/mongodb";
import Member from "@/models/Member";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    
    // 1. Fetch EVERY user who has ever signed up via Clerk
    const client = await clerkClient();
    const clerkUsers = await client.users.getUserList({ limit: 500 }); 

    // 2. Fetch the database records to see who is officially approved/paid
    const dbMembers = await Member.find({});

    // 3. Merge them together
    const directory = clerkUsers.data.map((user) => {
      // Look for a matching database record
      const dbMatch = dbMembers.find((m) => m.clerkId === user.id);
      
      // Combine Clerk's profile picture with the DB's official status
      return {
        clerkId: user.id,
        fullName: dbMatch?.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || "Club Member",
        imageUrl: user.imageUrl, // Automatically grabs their Google/Clerk profile picture
        status: dbMatch?.status || "Unregistered", 
      };
    });

    // 4. Sort the directory: Registered Members appear first, then sorted alphabetically
    directory.sort((a, b) => {
      if (a.status === "Registered Member" && b.status !== "Registered Member") return -1;
      if (b.status === "Registered Member" && a.status !== "Registered Member") return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json(directory, { status: 200 });
  } catch (error: any) {
    console.error("Directory fetch error:", error);
    return NextResponse.json({ error: "Failed to load directory" }, { status: 500 });
  }
}