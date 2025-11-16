import { NextResponse } from 'next/server';
import {
  getPartnerSessionTokenFromHeaders,
  loadPartnerSession,
} from '@/lib/partner/session';

export async function GET(req: Request) {
  const token = getPartnerSessionTokenFromHeaders(req.headers);
  if (!token) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  const session = await loadPartnerSession(token);
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  return NextResponse.json({
    session: {
      id: session.id,
      expiresAt: session.expiresAt,
      partnerUser: {
        id: session.partnerUser.id,
        email: session.partnerUser.email,
        name: session.partnerUser.name,
      },
      partnerProject: {
        id: session.partnerProject.id,
        partnerName: session.partnerProject.partnerName,
        status: session.partnerProject.status,
        projectId: session.partnerProject.projectId,
        projectName: session.partnerProject.project.name,
      },
    },
  });
}
