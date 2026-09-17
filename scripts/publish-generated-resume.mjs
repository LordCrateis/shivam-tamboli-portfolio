import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const SETTINGS_ID = 'b0000000-0000-0000-0000-000000000001';
const PROFILE_ID = 'a0000000-0000-0000-0000-000000000001';
const RESUME_BUCKET = 'resume-files';
const RESUME_PATH = 'generated/shivam-tamboli-resume.pdf';

const supabaseUrl = process.env.PORTFOLIO_SUPABASE_URL;
const secretKey = process.env.PORTFOLIO_SUPABASE_SECRET_KEY;
if (!supabaseUrl || !secretKey) {
  throw new Error('Missing PORTFOLIO_SUPABASE_URL or PORTFOLIO_SUPABASE_SECRET_KEY');
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

if (process.argv[2] === 'failure') {
  const runUrl = process.env.GITHUB_RUN_URL || 'the GitHub Actions run';
  const { error } = await supabase
    .from('resume_settings')
    .update({
      generation_status: 'failed',
      generation_error: `Resume compilation failed. Inspect ${runUrl}`,
    })
    .eq('id', SETTINGS_ID);
  if (error) throw error;
  process.exit(0);
}

const pdf = await readFile('resume.pdf');
const { error: uploadError } = await supabase.storage
  .from(RESUME_BUCKET)
  .upload(RESUME_PATH, pdf, { contentType: 'application/pdf', upsert: true });
if (uploadError) throw uploadError;

const { data: publicUrl } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(RESUME_PATH);
const generatedAt = new Date().toISOString();
const versionedUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;

const [{ error: profileError }, { error: settingsError }] = await Promise.all([
  supabase
    .from('profile')
    .update({ resume_url: versionedUrl, updated_at: generatedAt })
    .eq('id', PROFILE_ID),
  supabase
    .from('resume_settings')
    .update({
      generation_status: 'ready',
      generation_error: null,
      generated_at: generatedAt,
    })
    .eq('id', SETTINGS_ID),
]);
if (profileError) throw profileError;
if (settingsError) throw settingsError;

console.log(`Published generated resume at ${versionedUrl}`);
