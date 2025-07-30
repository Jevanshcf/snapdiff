
iimport type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { chromium } from 'playwright'; // NOTE: Chromium won't run in Vercel by default
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Resend } from 'resend';
import { Readable } from 'stream';

export const config = {
  schedule: '0 2 * * *',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { data: pages, error: pageError } = await supabase.from('pages').select('*');
    if (pageError) throw pageError;
    if (!pages || pages.length === 0) return res.status(200).json({ ok: true, message: 'No pages to process' });

    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    const resend = new Resend(process.env.RESEND_API_KEY!);

    for (const p of pages) {
      try {
        await page.goto(p.url, { waitUntil: 'networkidle' });
        const screenshotBuffer = await page.screenshot();

        const todayKey = `screenshots/${p.id}/${Date.now()}.png`;
        await supabase.storage.from('snapshots').upload(todayKey, screenshotBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

        const { data: list } = await supabase.storage
          .from('snapshots')
          .list(`screenshots/${p.id}`, { limit: 2, sortBy: { column: 'name', order: 'desc' } });

        if (list && list.length > 1) {
          const { data: yesterdayFile, error: downloadErr } = await supabase.storage
            .from('snapshots')
            .download(`screenshots/${p.id}/${list[1].name}`);
          if (downloadErr) throw downloadErr;

          const oldBuffer = Buffer.from(await yesterdayFile.arrayBuffer());
          const oldPng = PNG.sync.read(oldBuffer);
          const newPng = PNG.sync.read(screenshotBuffer);
          const diff = new PNG({ width: oldPng.width, height: oldPng.height });

          const pixels = pixelmatch(oldPng.data, newPng.data, diff.data, oldPng.width, oldPng.height);
          const diffPercent = (pixels / (oldPng.width * oldPng.height)) * 100;

          if (diffPercent > 1) {
            const diffKey = `diffs/${p.id}/${Date.now()}.png`;
            const diffBuffer = PNG.sync.write(diff);

            await supabase.storage.from('snapshots').upload(diffKey, diffBuffer, {
              contentType: 'image/png',
              upsert: true,
            });

            const { data: publicUrlData } = supabase.storage.from('snapshots').getPublicUrl(diffKey);

            await resend.emails.send({
              from: 'alerts@snapdiff.io',
              to: p.owner_email,
              subject: `🔔 SnapDiff: Changes detected on ${p.url}`,
              html: `<p>${diffPercent.toFixed(2)}% of pixels changed.</p><img src="${publicUrlData.publicUrl}" />`,
            });

            await supabase.from('pages').update({ last_diff: diffKey }).eq('id', p.id);
          }
        }
      } catch (innerErr) {
        console.error(`Error processing page ${p.url}:`, innerErr);
      }
    }

    await browser.close();
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('SnapDiff Cron Error:', err);
    return res.status(500).json({ error: 'Failed to run SnapDiff', details: (err as Error).message });
  }
}
