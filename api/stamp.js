import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// دەمێ چاڤەڕێبوونێ (٣٠ خولەک)
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
    let { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (!customer) {
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{ phone: phone, stamps: 0, rewards: 0, updated_at: new Date() }])
        .select()
        .single();
      customer = newCustomer;
    }

    if (action === 'get') {
      return res.status(200).json(customer);
    }

    if (action === 'stamp') {
      const now = new Date();
      
      // پشکنینا ماوەیێ ٣٠ خولەکان د ناڤبەرا دوو مۆران دا
      if (customer.updated_at && customer.stamps > 0) {
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

      let newStamps = customer.stamps + 1;
      let newRewards = customer.rewards || 0;

      if (newStamps >= 6) {
        newStamps = 0;
        newRewards += 1;
      }

      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ stamps: newStamps, rewards: newRewards, updated_at: now.toISOString() })
        .eq('phone', phone)
        .select()
        .single();

      return res.status(200).json(updatedCustomer);
    }

  } catch (err) {
    return res.status(500).json({ error: 'خەلەتیەک چێبوو: ' + err.message });
  }
}
