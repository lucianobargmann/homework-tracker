import { NextResponse } from 'next/server'

export async function GET() {
  // Return server timestamp for client synchronization
  // This is used to calculate the offset between server and client time
  // for display purposes only - all authoritative timing stays on server
  return NextResponse.json({
    serverTime: new Date().toISOString(),
    timestamp: Date.now()
  })
}
