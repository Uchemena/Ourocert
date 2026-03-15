import { NextResponse } from 'next/server'

// All plans now have unlimited templates — this endpoint always allows creation.
export async function GET() {
  return NextResponse.json({ atLimit: false, count: 0, limit: Infinity })
}
