import { NextResponse } from "next/server";
import { companyDetails } from "@/lib/company";

export async function GET() {
  return NextResponse.json(companyDetails());
}
