import { useCallback, useEffect, useState } from 'react';
import { FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const RESUME_SETTINGS_ID = 'b0000000-0000-0000-0000-000000000001';

interface EducationItem {
  school: string;
  location: string;
  degree: string;
  dates: string;
  details: string[];
}

interface ExperienceItem {
  role: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

interface SkillItem {
  label: string;
  items: string;
}

interface ResumeSettingsRecord {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  education: EducationItem[];
  experience: ExperienceItem[];
  skills: SkillItem[];
  generation_status: 'never' | 'generating' | 'ready' | 'failed';
  generation_error: string | null;
  generated_at: string | null;
}

const EMPTY_SETTINGS: ResumeSettingsRecord = {
  id: RESUME_SETTINGS_ID,
  full_name: 'Shivam Tamboli',
  email: '',
  phone: '',
  location: '',
  linkedin_url: '',
  github_url: 'https://github.com/LordCrateis',
  education: [],
  experience: [],
  skills: [],
  generation_status: 'never',
  generation_error: null,
  generated_at: null,
};

const inputClass = 'w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none';

export default function ResumeSettings() {
  const [settings, setSettings] = useState<ResumeSettingsRecord>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('resume_settings')
      .select('*')
      .eq('id', RESUME_SETTINGS_ID)
      .maybeSingle();

    if (error) {
      setMessage('Apply the resume schema to unlock these controls.');
    } else if (data) {
      setSettings(data as ResumeSettingsRecord);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const generate = async () => {
    setGenerating(true);
    setMessage('Queuing PDF generation…');
    const { error } = await supabase.functions.invoke('generate-resume');
    setMessage(error ? 'GitHub resume generation could not be queued.' : 'Resume generation queued in GitHub Actions.');
    await loadSettings();
    setGenerating(false);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      ...settings,
      email: settings.email?.trim() || null,
      phone: settings.phone?.trim() || null,
      location: settings.location?.trim() || null,
      linkedin_url: settings.linkedin_url?.trim() || null,
      github_url: settings.github_url?.trim() || null,
      education: settings.education.map((item) => ({ ...item, details: item.details.filter(Boolean) })),
      experience: settings.experience.map((item) => ({ ...item, bullets: item.bullets.filter(Boolean) })),
      skills: settings.skills.filter((item) => item.label.trim() || item.items.trim()),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('resume_settings').upsert(payload);
    if (error) {
      setMessage('Could not save the resume sections.');
    } else {
      setMessage('Resume content saved.');
      await generate();
    }
    setSaving(false);
  };

  if (loading) {
    return <p className="mb-8 text-sm text-ink-muted">Loading resume controls…</p>;
  }

  return (
    <div className="mb-12 border border-ink/15 p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="terminal-text text-xs uppercase tracking-widest text-ink-muted">Generated Resume</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            These static sections and the projects marked “In Resume” are rendered into the locked Jake&apos;s Resume layout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void generate()}
          disabled={generating}
          className="inline-flex items-center gap-2 border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide disabled:opacity-60"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          Generate now
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <input className={inputClass} value={settings.full_name} placeholder="Full name" onChange={(e) => setSettings((s) => ({ ...s, full_name: e.target.value }))} />
        <input className={inputClass} value={settings.email ?? ''} placeholder="Email" onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))} />
        <input className={inputClass} value={settings.phone ?? ''} placeholder="Phone" onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))} />
        <input className={inputClass} value={settings.location ?? ''} placeholder="Location" onChange={(e) => setSettings((s) => ({ ...s, location: e.target.value }))} />
        <input className={inputClass} value={settings.linkedin_url ?? ''} placeholder="LinkedIn URL" onChange={(e) => setSettings((s) => ({ ...s, linkedin_url: e.target.value }))} />
        <input className={inputClass} value={settings.github_url ?? ''} placeholder="GitHub URL" onChange={(e) => setSettings((s) => ({ ...s, github_url: e.target.value }))} />
      </div>

      <SectionTitle title="Education" onAdd={() => setSettings((s) => ({ ...s, education: [...s.education, { school: '', location: '', degree: '', dates: '', details: [] }] }))} />
      {settings.education.map((item, index) => (
        <div key={`education-${index}`} className="mb-4 grid gap-3 border border-ink/10 p-4 md:grid-cols-2">
          <input className={inputClass} value={item.school} placeholder="School" onChange={(e) => setSettings((s) => ({ ...s, education: replaceAt(s.education, index, { ...item, school: e.target.value }) }))} />
          <input className={inputClass} value={item.location} placeholder="Location" onChange={(e) => setSettings((s) => ({ ...s, education: replaceAt(s.education, index, { ...item, location: e.target.value }) }))} />
          <input className={inputClass} value={item.degree} placeholder="Degree" onChange={(e) => setSettings((s) => ({ ...s, education: replaceAt(s.education, index, { ...item, degree: e.target.value }) }))} />
          <input className={inputClass} value={item.dates} placeholder="Dates" onChange={(e) => setSettings((s) => ({ ...s, education: replaceAt(s.education, index, { ...item, dates: e.target.value }) }))} />
          <textarea className={`${inputClass} min-h-20 md:col-span-2`} value={item.details.join('\n')} placeholder="Optional details, one per line" onChange={(e) => setSettings((s) => ({ ...s, education: replaceAt(s.education, index, { ...item, details: splitLines(e.target.value) }) }))} />
          <RemoveButton onClick={() => setSettings((s) => ({ ...s, education: removeAt(s.education, index) }))} />
        </div>
      ))}

      <SectionTitle title="Experience" onAdd={() => setSettings((s) => ({ ...s, experience: [...s.experience, { role: '', company: '', location: '', dates: '', bullets: [] }] }))} />
      {settings.experience.map((item, index) => (
        <div key={`experience-${index}`} className="mb-4 grid gap-3 border border-ink/10 p-4 md:grid-cols-2">
          <input className={inputClass} value={item.role} placeholder="Role" onChange={(e) => setSettings((s) => ({ ...s, experience: replaceAt(s.experience, index, { ...item, role: e.target.value }) }))} />
          <input className={inputClass} value={item.company} placeholder="Company" onChange={(e) => setSettings((s) => ({ ...s, experience: replaceAt(s.experience, index, { ...item, company: e.target.value }) }))} />
          <input className={inputClass} value={item.location} placeholder="Location" onChange={(e) => setSettings((s) => ({ ...s, experience: replaceAt(s.experience, index, { ...item, location: e.target.value }) }))} />
          <input className={inputClass} value={item.dates} placeholder="Dates" onChange={(e) => setSettings((s) => ({ ...s, experience: replaceAt(s.experience, index, { ...item, dates: e.target.value }) }))} />
          <textarea className={`${inputClass} min-h-24 md:col-span-2`} value={item.bullets.join('\n')} placeholder="Bullets, one per line" onChange={(e) => setSettings((s) => ({ ...s, experience: replaceAt(s.experience, index, { ...item, bullets: splitLines(e.target.value) }) }))} />
          <RemoveButton onClick={() => setSettings((s) => ({ ...s, experience: removeAt(s.experience, index) }))} />
        </div>
      ))}

      <SectionTitle title="Technical Skills" onAdd={() => setSettings((s) => ({ ...s, skills: [...s.skills, { label: '', items: '' }] }))} />
      {settings.skills.map((item, index) => (
        <div key={`skill-${index}`} className="mb-3 grid gap-3 md:grid-cols-[12rem_1fr_auto]">
          <input className={inputClass} value={item.label} placeholder="Label" onChange={(e) => setSettings((s) => ({ ...s, skills: replaceAt(s.skills, index, { ...item, label: e.target.value }) }))} />
          <input className={inputClass} value={item.items} placeholder="Python, TypeScript, PostgreSQL…" onChange={(e) => setSettings((s) => ({ ...s, skills: replaceAt(s.skills, index, { ...item, items: e.target.value }) }))} />
          <RemoveButton onClick={() => setSettings((s) => ({ ...s, skills: removeAt(s.skills, index) }))} />
        </div>
      ))}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void save()} disabled={saving || generating} className="inline-flex items-center gap-2 bg-ink px-4 py-2 text-xs uppercase tracking-wide text-cream disabled:opacity-60">
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
          Save and regenerate
        </button>
        <span className="text-xs text-ink-muted">
          Status: {settings.generation_status}{settings.generated_at ? ` · ${new Date(settings.generated_at).toLocaleString()}` : ''}
        </span>
      </div>
      {(message || settings.generation_error) && <p className="mt-3 text-xs leading-relaxed text-ink-muted">{message || settings.generation_error}</p>}
    </div>
  );
}

function SectionTitle({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="mb-3 mt-8 flex items-center justify-between border-b border-ink/10 pb-2">
      <p className="terminal-text text-xs uppercase tracking-widest text-ink-muted">{title}</p>
      <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-ink-muted"><Plus size={12} /> Add</button>
    </div>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 justify-self-start text-xs uppercase tracking-wide text-red-600"><Trash2 size={12} /> Remove</button>;
}

function replaceAt<T>(items: T[], index: number, next: T): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? next : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function splitLines(value: string): string[] {
  return value.split('\n').map((item) => item.trim());
}
