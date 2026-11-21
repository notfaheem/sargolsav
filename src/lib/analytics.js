import { supabase } from './supabase';

/**
 * Fire-and-forget, non-blocking event logger.
 * Never throws, never blocks calling functions or UI rendering.
 */
export function logAnalyticsEvent({
  event_type,
  item_code = null,
  item_name = null,
  category = null,
  madrasa = null,
  metadata = null,
}) {
  try {
    if (!event_type) return;

    let metaStr = metadata;
    if (metadata && typeof metadata === 'object') {
      try {
        metaStr = JSON.stringify(metadata);
      } catch (e) {
        metaStr = String(metadata);
      }
    } else if (metadata !== null && metadata !== undefined) {
      metaStr = String(metadata);
    }

    const payload = {
      event_type,
      item_code: item_code !== null && item_code !== undefined ? String(item_code) : null,
      item_name: item_name ? String(item_name) : null,
      category: category ? String(category) : null,
      madrasa: madrasa ? String(madrasa) : null,
      metadata: metaStr,
    };

    // Non-blocking fire-and-forget Supabase insert
    supabase
      .from('analytics_events')
      .insert(payload)
      .then(() => {})
      .catch((err) => {
        // Silently caught - never throw or block UI
        if (import.meta.env?.DEV) {
          console.debug('[Analytics] Failed to insert event:', err?.message);
        }
      });
  } catch (err) {
    // Fail-safe outer catch
  }
}

/**
 * Track page view once per browser session per page tag (e.g. 'home' or 'poster').
 * Also updates settings.total_views baseline if not yet counted for this visitor.
 */
export function trackPageView(page = 'home') {
  try {
    const sessionKey = 'sargolsav_session_logged';
    const loggedStr = sessionStorage.getItem(sessionKey) || '';
    const loggedPages = loggedStr ? loggedStr.split(',') : [];

    if (!loggedPages.includes(page)) {
      loggedPages.push(page);
      sessionStorage.setItem(sessionKey, loggedPages.join(','));

      // Fire analytics event
      logAnalyticsEvent({
        event_type: 'page_view',
        metadata: page,
      });

      // Update total_views counter in settings table (once per visitor session)
      const hasViewedOverall = sessionStorage.getItem('sargolsav_viewed');
      if (!hasViewedOverall) {
        sessionStorage.setItem('sargolsav_viewed', '1');
        supabase
          .rpc('increment_total_views')
          .then(({ error }) => {
            if (error) {
              // Fallback direct increment if RPC is missing
              supabase
                .from('settings')
                .select('total_views')
                .eq('id', 1)
                .single()
                .then(({ data }) => {
                  const currentViews = Number(data?.total_views) || 0;
                  supabase
                    .from('settings')
                    .update({ total_views: currentViews + 1 })
                    .eq('id', 1)
                    .then(() => {})
                    .catch(() => {});
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }
    }
  } catch (e) {
    // Fail-safe
  }
}
