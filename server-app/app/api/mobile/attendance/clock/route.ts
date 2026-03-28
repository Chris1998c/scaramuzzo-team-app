import { NextResponse } from 'next/server';

import { getDistanceMeters } from '@/lib/geo';
import {
  getLastAttendanceType,
  getStaffSalonForClock,
  insertAttendanceLogClock,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClockAction = 'in' | 'out';

const GEOFENCE_MAX_METERS = 500;

function parseClockBody(raw: unknown): { staff_id: number; lat: number; lng: number } | null {
  if (raw == null || typeof raw !== 'object') {
    return null;
  }
  const b = raw as Record<string, unknown>;
  const staffId = Number(b.staff_id);
  const lat = Number(b.lat);
  const lng = Number(b.lng);

  if (!Number.isFinite(staffId) || staffId <= 0) {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { staff_id: staffId, lat, lng };
}

export async function POST(req: Request) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Body non valido' }, { status: 400 });
    }

    const parsed = parseClockBody(raw);
    if (!parsed) {
      return NextResponse.json(
        { success: false, error: 'Richiede staff_id, lat e lng validi' },
        { status: 400 }
      );
    }

    const { staff_id: staffId, lat: userLat, lng: userLng } = parsed;

    if (userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return NextResponse.json({ success: false, error: 'Coordinate non valide' }, { status: 400 });
    }

    const row = await getStaffSalonForClock(staffId);
    if (!row) {
      return NextResponse.json({ success: false, error: 'Staff non trovato' }, { status: 404 });
    }

    if (!row.mobile_enabled) {
      return NextResponse.json(
        { success: false, error: 'Accesso mobile non abilitato per questo profilo' },
        { status: 403 }
      );
    }

    const { salon_id: salonId, salon_lat: salonLat, salon_lng: salonLng } = row;

    if (
      salonLat == null ||
      salonLng == null ||
      !Number.isFinite(salonLat) ||
      !Number.isFinite(salonLng)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Coordinate del salone non disponibili: impossibile verificare la distanza',
        },
        { status: 400 }
      );
    }

    const distance = getDistanceMeters(userLat, userLng, salonLat, salonLng);
    if (distance > GEOFENCE_MAX_METERS) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sei troppo lontano dal salone per timbrare',
        },
        { status: 403 }
      );
    }

    const lastType = await getLastAttendanceType(staffId);
    const newType: ClockAction = lastType === 'in' ? 'out' : 'in';

    await insertAttendanceLogClock({
      staff_id: staffId,
      salon_id: salonId,
      type: newType,
    });

    return NextResponse.json({
      success: true,
      new_status: newType,
    });
  } catch (e) {
    console.error('[attendance/clock]', e);
    return NextResponse.json({ success: false, error: 'Errore server' }, { status: 500 });
  }
}
