import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'تنێ میتۆدا POST یا رێکپێدایە' });
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
        .insert([{ phone: phone, stamps: 0, rewards: 0 }])
        .select()
        .single();
      customer = newCustomer;
    }

    if (action === 'get') {
      return res.status(200).json(customer);
    }

    if (action === 'stamp') {
      let newStamps = customer.stamps + 1;
      let newRewards = customer.rewards;

      if (newStamps >= 6) {
        newStamps = 0;
        newRewards += 1;
      }

      const { data: updatedCustomer, error: updateError } = await supabase
        .from('customers')
        .update({ stamps: newStamps, rewards: newRewards, updated_at: new Date() })
        .eq('phone', phone)
        .select()
        .single();

      return res.status(200).json(updatedCustomer);
    }

  } catch (err) {
    return res.status(500).json({ error: 'خەلەتیەک د سێرڤەری دا چێبوو: ' + err.message });
  }
}
