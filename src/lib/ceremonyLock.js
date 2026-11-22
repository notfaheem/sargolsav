import { supabase } from './supabase';

export const ADMIN_BYPASS_KEY = 'sargolsav_admin_bypass';
export const ADMIN_SESSION_KEY = 'sargolsav_admin_session';
export const CEREMONY_LOCK_TAG = '[CEREMONY_LOCK]';

/**
 * Checks if the current browser session has permission to bypass the Ceremony Lock
 */
export function isAdminBypassActive() {
  try {
    const hasAdminSession = sessionStorage.getItem(ADMIN_SESSION_KEY) === 'authenticated';
    const hasBypassFlag = localStorage.getItem(ADMIN_BYPASS_KEY) === 'true';
    return Boolean(hasAdminSession || hasBypassFlag);
  } catch {
    return false;
  }
}

/**
 * Sets the private admin bypass in localStorage
 */
export function setAdminBypass(enabled) {
  try {
    if (enabled) {
      localStorage.setItem(ADMIN_BYPASS_KEY, 'true');
    } else {
      localStorage.removeItem(ADMIN_BYPASS_KEY);
    }
  } catch (e) {
    console.warn('Failed to set admin bypass storage:', e);
  }
}

/**
 * Evaluates whether Ceremony Lock is active from Supabase settings row or fallback text
 */
export function isCeremonyLocked(settingsData) {
  if (!settingsData) return false;
  return Boolean(
    settingsData.is_ceremony_lock ||
    (typeof settingsData.announcement_text === 'string' &&
      settingsData.announcement_text.includes(CEREMONY_LOCK_TAG)) ||
    (typeof settingsData.notice_text === 'string' &&
      settingsData.notice_text.includes(CEREMONY_LOCK_TAG))
  );
}

/**
 * Strips [CEREMONY_LOCK] tag from announcement text for clean public display
 */
export function cleanAnnouncementText(text) {
  if (!text) return '';
  return text.replace(/\[CEREMONY_LOCK\]/g, '').trim();
}

/**
 * Saves Ceremony Lock state to Supabase settings with resilient fallback
 */
export async function updateCeremonyLockInDb(isLocked, currentSettings = {}) {
  try {
    // 1. First attempt: Direct update to is_ceremony_lock column
    const { error } = await supabase
      .from('settings')
      .update({ is_ceremony_lock: isLocked })
      .eq('id', 1);

    if (!error) {
      try {
        localStorage.setItem('sargolsav_ceremony_lock', isLocked ? 'true' : 'false');
      } catch {}
      return { success: true, method: 'column' };
    }

    // 2. Fallback: If column does not exist or schema cache error, use announcement_text tag
    console.warn('is_ceremony_lock column update failed, trying announcement_text fallback:', error.message);
    const existingText = currentSettings.announcement_text || '';
    const cleanText = cleanAnnouncementText(existingText);
    const fallbackText = isLocked ? `${CEREMONY_LOCK_TAG} ${cleanText}` : cleanText;

    const { error: fallbackError } = await supabase
      .from('settings')
      .update({ announcement_text: fallbackText })
      .eq('id', 1);

    if (fallbackError) {
      throw fallbackError;
    }

    try {
      localStorage.setItem('sargolsav_ceremony_lock', isLocked ? 'true' : 'false');
    } catch {}
    return { success: true, method: 'announcement_tag' };
  } catch (err) {
    console.error('Failed to update ceremony lock in Supabase:', err);
    throw err;
  }
}
