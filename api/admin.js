import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_PASSWORD = "admin123"; // تو دشێی ڤی پاسۆردی بۆ خودانێ کافێیێ بگوهۆڕی

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'تەنێ میتۆدا POST ڕێکپێدایە' });
  }

  const { password } = req.body;

  // پشکنینا پاسۆردی
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'پاسۆرد خەلەتە' });
  }

  try {
    // هینانا هەمی کڕیاران و ڕیزکرنا وان ل دووڤ نویترین سەرەدان
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'خەلەتیەک چێبوو: ' + err.message });
  }
}
