import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
    });
  }
  return pool;
}

/** Staff + salone per clock: geofence e verifica mobile_enabled. */
export type StaffSalonClockRow = {
  staff_id: number;
  salon_id: number;
  mobile_enabled: boolean;
  salon_lat: number | null;
  salon_lng: number | null;
};

export async function getStaffSalonForClock(staffId: number): Promise<StaffSalonClockRow | null> {
  const p = getPool();
  const [rows] = await p.execute<mysql.RowDataPacket[]>(
    `SELECT s.id AS staff_id, s.salon_id, s.mobile_enabled, sl.lat AS salon_lat, sl.lng AS salon_lng
     FROM staff s
     INNER JOIN salons sl ON sl.id = s.salon_id
     WHERE s.id = ?
     LIMIT 1`,
    [staffId]
  );
  const row = rows[0];
  if (!row) {
    return null;
  }
  const me = row.mobile_enabled;
  const mobileEnabled = me === true || me === 1 || me === '1' || me === 'true';
  return {
    staff_id: Number(row.staff_id),
    salon_id: Number(row.salon_id),
    mobile_enabled: mobileEnabled,
    salon_lat: row.salon_lat != null ? Number(row.salon_lat) : null,
    salon_lng: row.salon_lng != null ? Number(row.salon_lng) : null,
  };
}

export async function getLastAttendanceType(staffId: number): Promise<'in' | 'out' | null> {
  const p = getPool();
  const [rows] = await p.execute<mysql.RowDataPacket[]>(
    `SELECT type FROM attendance_logs WHERE staff_id = ? ORDER BY created_at DESC LIMIT 1`,
    [staffId]
  );
  const t = rows[0]?.type;
  if (t === 'in' || t === 'out') {
    return t;
  }
  return null;
}

/**
 * Solo attendance_logs; created_at gestito dal DB (DEFAULT timestamptz / CURRENT_TIMESTAMP).
 */
export async function insertAttendanceLogClock(params: {
  staff_id: number;
  salon_id: number;
  type: 'in' | 'out';
}): Promise<void> {
  const p = getPool();
  await p.execute(
    `INSERT INTO attendance_logs (staff_id, salon_id, type) VALUES (?, ?, ?)`,
    [params.staff_id, params.salon_id, params.type]
  );
}
