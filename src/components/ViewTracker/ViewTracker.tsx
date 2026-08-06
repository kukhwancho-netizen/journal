'use client';

import { useEffect } from 'react';

interface Props {
  postId: string | number;
}

/**
 * Closes the marketing measurement loop: increments posts.views once per post
 * per session. RLS allows anon PATCH on posts.views. Best-effort — never blocks
 * article rendering. Feeds marketing-director 3-day pulse (collect_post_performance).
 */
function ViewTracker({ postId }: Props) {
  useEffect(() => {
    const id = Number(postId);
    if (!id || id <= 0) return;
    const KEY = `viewed_post_${id}`;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, '1');
    } catch {
      // sessionStorage blocked; proceed best-effort
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    (async () => {
      try {
        const headers: Record<string, string> = {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        };
        const curRes = await fetch(
          `${url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}&select=views`,
          { headers },
        );
        const curJson = await curRes.json();
        const cur =
          curJson && curJson[0] && typeof curJson[0].views === 'number'
            ? curJson[0].views
            : 0;
        await fetch(`${url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ views: cur + 1 }),
        });
      } catch {
        // best-effort: view tracking must never break article rendering
      }
    })();
  }, [postId]);
  return null;
}

export default ViewTracker;
