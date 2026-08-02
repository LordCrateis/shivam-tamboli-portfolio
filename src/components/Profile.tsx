import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, FileText, Loader2, Pencil, Save, X } from 'lucide-react';
import FadeUp from './FadeUp';
import { supabase } from '../lib/supabase';

const PROFILE_ID = 'a0000000-0000-0000-0000-000000000001';
const PHOTO_BUCKET = 'profile-photos';
const RESUME_BUCKET = 'resume-files';

interface ProfileRecord {
  id: string;
  photo_url: string | null;
  thought_text: string | null;
  name: string | null;
  age: number | null;
  tagline: string | null;
  currently: string | null;
  course: string | null;
  college: string | null;
  cgpa: string | null;
  dream: string | null;
  resume_url: string | null;
  github_url: string | null;
  x_url: string | null;
  bluesky_url: string | null;
  peerlist_url: string | null;
  hashnode_url: string | null;
}

interface ProfileDraft {
  name: string;
  age: string;
  tagline: string;
  currently: string;
  thought_text: string;
  course: string;
  college: string;
  cgpa: string;
  dream: string;
  github_url: string;
  x_url: string;
  bluesky_url: string;
  peerlist_url: string;
  hashnode_url: string;
}

const SOCIAL_LINKS: Array<{ key: keyof ProfileDraft; label: string; slug: string }> = [
  { key: 'github_url', label: 'GitHub', slug: 'github' },
  { key: 'x_url', label: 'X', slug: 'x' },
  { key: 'bluesky_url', label: 'Bluesky', slug: 'bluesky' },
  { key: 'peerlist_url', label: 'Peerlist', slug: 'peerlist' },
  { key: 'hashnode_url', label: 'Hashnode', slug: 'hashnode' },
];

function recordToDraft(record: ProfileRecord | null): ProfileDraft {
  return {
    name: record?.name ?? '',
    age: record?.age != null ? String(record.age) : '',
    tagline: record?.tagline ?? '',
    currently: record?.currently ?? '',
    thought_text: record?.thought_text ?? '',
    course: record?.course ?? '',
    college: record?.college ?? '',
    cgpa: record?.cgpa ?? '',
    dream: record?.dream ?? '',
    github_url: record?.github_url ?? '',
    x_url: record?.x_url ?? '',
    bluesky_url: record?.bluesky_url ?? '',
    peerlist_url: record?.peerlist_url ?? '',
    hashnode_url: record?.hashnode_url ?? '',
  };
}

function uploadFileWithProgress(
  bucket: string,
  file: File,
  accessToken: string,
  onProgress: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const path = `${crypto.randomUUID()}-${file.name}`;
    const xhr = new XMLHttpRequest();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'true');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(path);
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });
}

interface ProfileProps {
  isAdminSession: boolean;
}

export default function Profile({ isAdminSession }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [downloadingResume, setDownloadingResume] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft>(recordToDraft(null));
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('profile')
      .select('*')
      .eq('id', PROFILE_ID)
      .maybeSingle();

    if (fetchError) {
      setError('Unable to load profile right now.');
    } else {
      setError(null);
      setProfile(data as ProfileRecord | null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const startEditing = () => {
    setDraft(recordToDraft(profile));
    setPendingPhotoFile(null);
    setPhotoPreview(null);
    setPendingResumeFile(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setPendingPhotoFile(null);
    setPhotoPreview(null);
    setPendingResumeFile(null);
  };

  const handlePhotoSelect = (file: File) => {
    setPendingPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      let photoUrl = profile?.photo_url ?? null;
      let resumeUrl = profile?.resume_url ?? null;

      if (pendingPhotoFile || pendingResumeFile) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) throw new Error('Not authenticated');

        if (pendingPhotoFile) {
          setUploadProgress(0);
          const path = await uploadFileWithProgress(PHOTO_BUCKET, pendingPhotoFile, accessToken, setUploadProgress);
          const { data: urlData } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
          photoUrl = urlData.publicUrl;
        }

        if (pendingResumeFile) {
          setUploadProgress(0);
          const path = await uploadFileWithProgress(RESUME_BUCKET, pendingResumeFile, accessToken, setUploadProgress);
          const { data: urlData } = supabase.storage.from(RESUME_BUCKET).getPublicUrl(path);
          resumeUrl = urlData.publicUrl;
        }
      }

      const payload = {
        photo_url: photoUrl,
        resume_url: resumeUrl,
        name: draft.name.trim() || null,
        age: draft.age.trim() ? Number(draft.age.trim()) : null,
        tagline: draft.tagline.trim() || null,
        currently: draft.currently.trim() || null,
        thought_text: draft.thought_text.trim() || null,
        course: draft.course.trim() || null,
        college: draft.college.trim() || null,
        cgpa: draft.cgpa.trim() || null,
        dream: draft.dream.trim() || null,
        github_url: draft.github_url.trim() || null,
        x_url: draft.x_url.trim() || null,
        bluesky_url: draft.bluesky_url.trim() || null,
        peerlist_url: draft.peerlist_url.trim() || null,
        hashnode_url: draft.hashnode_url.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase.from('profile').update(payload).eq('id', PROFILE_ID);
      if (updateError) {
        setError('Could not save profile.');
      } else {
        await fetchProfile();
        setIsEditing(false);
        setPendingPhotoFile(null);
        setPhotoPreview(null);
        setPendingResumeFile(null);
      }
    } catch (err) {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDownloadResume = async () => {
    if (!profile?.resume_url) return;
    setDownloadingResume(true);
    try {
      const response = await fetch(profile.resume_url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${profile.name?.trim().replace(/\s+/g, '-') || 'resume'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      setError('Could not download resume right now.');
    } finally {
      setDownloadingResume(false);
    }
  };

  const activeSocials = SOCIAL_LINKS.filter((social) => profile?.[social.key.replace('_url', '_url') as keyof ProfileRecord]);

  if (loading) {
    return (
      <section className="pt-32 pb-28 px-6 md:px-12 lg:px-16">
        <p className="text-sm text-ink-muted">Loading profile…</p>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-28 px-6 md:px-12 lg:px-16 max-w-4xl mx-auto">
      <FadeUp>
        <div className="flex items-center justify-between mb-12">
          <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase">Profile</p>
          {isAdminSession && !isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="inline-flex items-center gap-1 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink-muted"
              data-cursor="pointer"
            >
              <Pencil size={12} /> Edit
            </button>
          )}
        </div>
      </FadeUp>

      {error && <p className="text-sm text-red-600 mb-6">{error}</p>}

      {isEditing ? (
        <FadeUp delay={0.1}>
          <div className="border border-ink/15 p-6 space-y-4">
            <div className="flex items-center gap-4">
              <img
                src={photoPreview ?? profile?.photo_url ?? ''}
                alt=""
                className="h-20 w-20 rounded-full border border-ink/20 object-cover bg-ink/5"
              />
              <label className="inline-flex cursor-pointer items-center gap-2 border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide text-ink-muted">
                Change photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handlePhotoSelect(file);
                  }}
                />
              </label>
            </div>

            {uploadProgress !== null && (
              <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                <div className="h-full bg-ink transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Name"
                className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <input
                type="number"
                value={draft.age}
                onChange={(e) => setDraft((prev) => ({ ...prev, age: e.target.value }))}
                placeholder="Age"
                className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
            </div>

            <input
              value={draft.tagline}
              onChange={(e) => setDraft((prev) => ({ ...prev, tagline: e.target.value }))}
              placeholder="One-line description"
              className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
            />

            <input
              value={draft.currently}
              onChange={(e) => setDraft((prev) => ({ ...prev, currently: e.target.value }))}
              placeholder="Currently — what you're working on right now"
              className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
            />

            <input
              value={draft.thought_text}
              onChange={(e) => setDraft((prev) => ({ ...prev, thought_text: e.target.value }))}
              placeholder="Thought bubble text (leave empty to hide)"
              className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
            />
            <div className="grid md:grid-cols-3 gap-4">
              <input
                value={draft.course}
                onChange={(e) => setDraft((prev) => ({ ...prev, course: e.target.value }))}
                placeholder="Course"
                className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <input
                value={draft.college}
                onChange={(e) => setDraft((prev) => ({ ...prev, college: e.target.value }))}
                placeholder="College"
                className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <input
                value={draft.cgpa}
                onChange={(e) => setDraft((prev) => ({ ...prev, cgpa: e.target.value }))}
                placeholder="CGPA"
                className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide text-ink-muted">
                <FileText size={14} />
                {pendingResumeFile ? pendingResumeFile.name : profile?.resume_url ? 'Replace resume (PDF)' : 'Upload resume (PDF)'}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setPendingResumeFile(file);
                  }}
                />
              </label>
            </div>

            <p className="terminal-text text-xs text-ink-muted uppercase tracking-wide pt-2">Handles</p>
            <div className="grid md:grid-cols-2 gap-4">
              {SOCIAL_LINKS.map((social) => (
                <input
                  key={social.key}
                  value={draft[social.key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [social.key]: e.target.value }))}
                  placeholder={`${social.label} URL`}
                  className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                />
              ))}
            </div>

            <textarea
              value={draft.dream}
              onChange={(e) => setDraft((prev) => ({ ...prev, dream: e.target.value }))}
              placeholder="Dream"
              className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none min-h-24"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 bg-ink text-cream px-4 py-2 text-xs uppercase tracking-wide disabled:opacity-60"
                data-cursor="pointer"
              >
                <Save size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="inline-flex items-center gap-1 border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide text-ink-muted"
                data-cursor="pointer"
              >
                <X size={12} /> Cancel
              </button>
            </div>
          </div>
        </FadeUp>
      ) : (
        <>
          <FadeUp delay={0.1}>
            <div className="flex flex-col sm:flex-row items-start gap-8 mb-14">
              {profile?.photo_url && (
                <div className="relative shrink-0">
                  {profile.thought_text && (
                    <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-full mb-3 sm:left-auto sm:translate-x-0 sm:right-full sm:bottom-auto sm:top-4 sm:mb-0 sm:mr-4">
                      <div className="relative max-w-[70vw] sm:max-w-none whitespace-normal sm:whitespace-nowrap rounded-2xl border border-ink/15 bg-cream px-4 py-2 font-sans text-sm text-ink shadow-md">
                        {profile.thought_text}
                      </div>
                      <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 h-2.5 w-2.5 rounded-full bg-cream border border-ink/15 sm:left-auto sm:translate-x-0 sm:right-3" />
                      <span className="absolute left-[calc(50%+8px)] top-full mt-4 h-1.5 w-1.5 rounded-full bg-cream border border-ink/15 sm:left-auto sm:right-0" />
                    </div>
                  )}
                  <img
                    src={profile.photo_url}
                    alt={profile.name ?? 'Profile photo'}
                    className="h-40 w-40 sm:h-48 sm:w-48 rounded-full border border-ink/15 object-cover"
                  />
                </div>
              )}
              <div className="pt-2">
                <div className="flex flex-wrap items-baseline gap-3 mb-3">
                  <h1 className="font-serif text-ink" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.6rem)' }}>
                    {profile?.name ?? 'Shivam Tamboli'}
                  </h1>
                  {profile?.age != null && (
                    <span className="terminal-text text-sm text-ink-muted">{profile.age}</span>
                  )}
                </div>
                {profile?.tagline && (
                  <p className="font-sans text-ink-muted text-base leading-relaxed max-w-lg mb-3">{profile.tagline}</p>
                )}
                {profile?.currently && (
                  <div className="inline-flex items-center gap-2 border border-ink/15 px-3 py-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink animate-pulse" />
                    <span className="terminal-text text-xs text-ink-muted uppercase tracking-wide">Currently</span>
                    <span className="font-sans text-xs text-ink">{profile.currently}</span>
                  </div>
                )}
              </div>
            </div>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="mb-12">
              <table className="w-full">
                <tbody>
                  {profile?.course && (
                    <tr className="border-b border-ink/8">
                      <td className="py-3 pr-6 font-sans text-xs text-ink-muted uppercase tracking-wide w-32 align-top">Course</td>
                      <td className="py-3 font-sans text-sm text-ink font-medium">{profile.course}</td>
                    </tr>
                  )}
                  {profile?.college && (
                    <tr className="border-b border-ink/8">
                      <td className="py-3 pr-6 font-sans text-xs text-ink-muted uppercase tracking-wide w-32 align-top">College</td>
                      <td className="py-3 font-sans text-sm text-ink font-medium">{profile.college}</td>
                    </tr>
                  )}
                  {profile?.cgpa && (
                    <tr className="border-b border-ink/8">
                      <td className="py-3 pr-6 font-sans text-xs text-ink-muted uppercase tracking-wide w-32 align-top">CGPA</td>
                      <td className="py-3 font-sans text-sm text-ink font-medium">{profile.cgpa}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </FadeUp>

          {activeSocials.length > 0 && (
            <FadeUp delay={0.28}>
              <div className="mb-12">
                <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-4">Handles</p>
                <div className="flex flex-wrap gap-3">
                  {activeSocials.map((social) => {
                    const href = profile?.[social.key as keyof ProfileRecord] as string;
                    return (
                      <a
                        key={social.key}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border border-ink/15 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors duration-150"
                        data-cursor="pointer"
                      >
                        <img
                          src={`https://cdn.simpleicons.org/${social.slug}/111111`}
                          alt=""
                          className="h-4 w-4 block dark:hidden"
                        />
                        <img
                          src={`https://cdn.simpleicons.org/${social.slug}/E8E3D6`}
                          alt=""
                          className="h-4 w-4 hidden dark:block"
                        />
                        {social.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            </FadeUp>
          )}

          {profile?.resume_url && (
            <FadeUp delay={0.32}>
              <div className="mb-12 flex items-center justify-between border border-ink/15 px-6 py-4">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-ink-muted" />
                  <span className="font-sans text-sm text-ink">Resume</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={profile.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink-muted hover:bg-ink/5 transition-colors duration-150"
                    data-cursor="pointer"
                  >
                    <Eye size={12} /> View
                  </a>

                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={downloadingResume}
                    className="inline-flex items-center gap-1.5 bg-ink text-cream px-3 py-1.5 text-xs uppercase tracking-wide hover:bg-ink-light transition-colors duration-150 disabled:opacity-60"
                    data-cursor="pointer"
                  >
                    {downloadingResume ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    Download
                  </button>
                </div>
              </div>
            </FadeUp>
          )}

          {profile?.dream && (
            <FadeUp delay={0.36}>
              <div className="border border-ink/15 p-6 relative">
                <div className="absolute -top-px left-6 right-6 h-px bg-ink" />
                <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-4">Dream</p>
                <p className="font-sans text-sm text-ink-muted leading-relaxed">{profile.dream}</p>
              </div>
            </FadeUp>
          )}
        </>
      )}
    </section>
  );
}