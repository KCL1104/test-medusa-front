import { NextRequest, NextResponse } from "next/server"

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000").replace(/\/+$/, "")

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ countryCode: string }> }
) {
  const { countryCode } = await params

  return NextResponse.redirect(
    `${BASE_URL}/${countryCode}/account${request.nextUrl.search}`,
    307
  )
}
