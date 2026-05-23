/** Chiavi SecureStore condivise tra login, home e logout. */
export const AUTH_STORAGE_KEYS = {
  staffId: 'staff_id',
  salonId: 'salon_id',
  salonIdsJson: 'salon_ids_json',
  currentMobileSalonId: 'current_mobile_salon_id',
  collaboratorName: 'collaborator_name',
  staffCode: 'staff_code',
  accessToken: 'access_token',
  tokenType: 'token_type',
  deviceId: 'device_id',
} as const;
