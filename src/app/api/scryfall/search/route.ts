import { searchCards } from "@/lib/scryfall";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }
  const printings = await searchCards(q);
  return NextResponse.json(printings);
}
