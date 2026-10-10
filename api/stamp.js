import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const COOLDOWN_MINUTES = 30;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'تەنێ میتۆدا POST یا رێکپێدایە' });
  }

  const { phone, action } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'ژمارا تەلەفۆنێ پێدڤیە' });
  }

  try {
    // ١. ل کڕیاری دگەڕیێت
    let { data: customer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .maybeSingle();

    // ٢. ئەگەر کڕیار نوی بوو (null بوو)، دێ ئێکسەر کڕیارەکێ نوی دروست کەت دا تێک نەچیت
    if (!customer) {
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{ phone: phone, stamps: 0, rewards: 0, updated_at: new Date().toISOString() }])
        .select()
        .single();
        
      if (insertError) {
        return res.status(500).json({ error: 'خەلەتی د دروستکرنا کڕیارێ نوی دا: ' + insertError.message });
      }
      customer = newCustomer;
    }

    if (action === 'get') {
      return res.status(200).json(customer);
    }

    if (action === 'stamp') {
      const now = new Date();
      
      // ٣. پشکنینا ماوەیێ ٣٠ خولەکان
      if (customer && customer.updated_at && customer.stamps > 0) {
        const lastStampTime = new Date(customer.updated_at).getTime();
        const diff = now.getTime() - lastStampTime;

        if (diff < COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((COOLDOWN_MS - diff) / (60 * 1000));
          return res.status(429).json({
            error: 'cooldown',
            message: `تکایە چاڤەڕێ بە، تو نەشێی مۆرەکا نوی لێبدەی هەتا ${remainingMinutes} خولەکێن دی.`
          });
        }
      }

      let newStamps = (customer.stamps || 0) + 1;
      let newRewards = customer.rewards || 0;

      if (newStamps >= 6) {
        newStamps = 0;
        newRewards += 1;
      }

      // ٤. نوی کرن و لێدانا مۆرێ (Update)
      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ stamps: newStamps, rewards: newRewards, updated_at: now.toISOString() })
        .eq('phone', phone)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: 'خەلەتی د نوی کرنێ دا: ' + updateError.message });
      }

      return res.status(200).json(updatedCustomer);
    }

  } catch (err) {
    return res.status(500).json({ error: 'خەلەتیەک چێبوو: ' + err.message });
  }
}
