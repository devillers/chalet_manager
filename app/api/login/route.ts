import {NextResponse, type NextRequest} from 'next/server'

export async function POST(request: NextRequest) {
  const {email, password} = (await request.json()) as {
    email: string
    password: string
  }

  // Stub à remplacer par ta vraie logique d’authentification
  const isValid = email === 'demo@demo.com' && password === 'demo'

  if (!isValid) {
    return NextResponse.json({error: 'Invalid credentials'}, {status: 401})
  }

  return NextResponse.json({
    success: true,
    ownerSlug: 'mon-chalet-exemple',
  })
}

