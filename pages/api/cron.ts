import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { chromium } from 'playwright';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { Resend } from 'resend';
export const config = {
  schedule: '0 2 * * *'
};
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { data: pages } = await supabase.from('pages').select('*');
  if (!pages) return res.status(200).json({ ok: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  const resend = new Resend(process.env.RESEND_API_KEY!);

  for (const p of pages) {
    await page.goto(p.url, { waitUntil: 'networkidle' });
    const buf = await page.screenshot();
    const todayKey = `screenshots/${p.id}/${Date.now()}.png`;
    await supabase.storage.from('snapshots').upload(todayKey, buf, { contentType: 'image/png' });

    const { data: list } = await supabase.storage.from('snapshots').list(`screenshots/${p.id}`, { limit: 2, sortBy: { column: 'name', order: 'desc' } });
    if (list && list.length > 1) {
      const yesterday = await supabase.storage.from('snapshots').download(`screenshots/${p.id}/${list[1].name}`);
      const img1 = PNG.sync.read(await yesterday.arrayBuffer());
      const img2 = PNG.sync.read(buf);
      const diff = new PNG({ width: img1.width, height: img1.height });
      const pixels = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height);
      const diffPercent = (pixels / (img1.width * img1.height)) * 100;

      if (diffPercent > 1) {
        const diffKey = `diffs/${p.id}/${Date.now()}.png`;
        await supabase.storage.from('snapshots').upload(diffKey, PNG.sync.write(diff), { contentType: 'image/png' });
        await resend.emails.send({
          from: 'alerts@snapdiff.io',
          to: p.owner_email,
          subject: `\uD83D\uDD14 SnapDiff: Changes detected on ${p.url}`,
          html: `<p>${diffPercent.toFixed(2)}% of pixels changed.</p><img src="${supabase.storage.from('snapshots').getPublicUrl(diffKey).data.publicUrl}" />`
        });
        await supabase.from('pages').update({ last_diff: diffKey }).eq('id', p.id);
      }
    }
  }
  await browser.close();
  res.status(200).json({ ok: true });
}
