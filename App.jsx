import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Lock, Shield, Search, GraduationCap, Pencil, X, Check, Loader2,
  Quote, Users, BookOpen, Heart, Mail, ArrowRight, Eye, EyeOff, Sparkles,
  Camera, Trash2, ExternalLink,
} from "lucide-react";

/* ============================================================
   CONFIG — paste your Supabase values to go live.
   Leave both empty for DEMO MODE (seed classmates, in-memory).
   ============================================================ */
const SUPABASE_URL = "";      // e.g. "https://abcd1234.supabase.co"
const SUPABASE_ANON_KEY = ""; // public anon key — RLS protects the data
const DEMO = !(SUPABASE_URL && SUPABASE_ANON_KEY);
const CLASS_YEAR = "2002";
const PHOTO_BUCKET = "profile-photos";
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/* Storage that never throws (sandboxes may block localStorage) */
const mem = {};
const store = {
  get: (k) => { try { return window.localStorage.getItem(k); } catch { return mem[k] ?? null; } },
  set: (k, v) => { try { window.localStorage.setItem(k, v); } catch { mem[k] = v; } },
  del: (k) => { try { window.localStorage.removeItem(k); } catch { delete mem[k]; } },
};

/* ============================================================
   DEMO SEED
   ============================================================ */
const SEED = [
  { id: "d1", display_name: "Priya Raman", nickname: "Turbo", school_year: CLASS_YEAR, occupation: "Paramedic", fav_teacher: "Mr. Okafor · Physics", fav_school_lunch: "Pie warmer special — always", best_mate: "Mele Tupou", iconic_trend: "Wearing jandals to assembly", embarrassing_moment: "Set the 100m record in jandals because she forgot her sneakers.", secret_talent: "Could outrun everyone on the field without trying", message_younger_self: "Keep showing up — even in the wrong shoes.", school_song: "Eye of the Tiger", is_hidden: false },
  { id: "d2", display_name: "Tom Whitford", nickname: "Whitty", school_year: CLASS_YEAR, occupation: "Builds tiny houses", fav_teacher: "Ms. Leilani · Art", fav_school_lunch: "Cheese rolls from the canteen", best_mate: "Dex Aroha", iconic_trend: "Potato-powered everything", embarrassing_moment: "Won the science fair with a potato clock built the night before.", secret_talent: "Could build anything from cardboard and tape", message_younger_self: "It's okay to cry at the goodbyes.", school_song: "Bitter Sweet Symphony", is_hidden: false },
  { id: "d3", display_name: "Mele Tupou", nickname: "Captain", school_year: CLASS_YEAR, occupation: "High school teacher", fav_teacher: "Mrs. Bennett · English", fav_school_lunch: "Chicken burger on Fridays", best_mate: "Priya Raman", iconic_trend: "Netball skirts as everyday wear", embarrassing_moment: "Organised the leavers' prank and forgot she was on cleanup duty.", secret_talent: "Could intimidate a ref with a single look", message_younger_self: "Lead with kindness — it lands harder than fear.", school_song: "Independent Women", is_hidden: false },
  { id: "d4", display_name: "Dex Aroha", nickname: "Dex", school_year: CLASS_YEAR, occupation: "Sound engineer", fav_teacher: "Mr. Vance · Music", fav_school_lunch: "Whatever he could trade for", best_mate: "Tom Whitford", iconic_trend: "Burned mix CDs for everyone", embarrassing_moment: "Slept through a fire drill. In the gym. During PE.", secret_talent: "Could tune a guitar by ear in under ten seconds", message_younger_self: "Those four chords will take you further than you think.", school_song: "Smells Like Teen Spirit", is_hidden: false },
  { id: "d5", display_name: "Sarah Lindqvist", nickname: "Swede", school_year: CLASS_YEAR, occupation: "Marine biologist", fav_teacher: "Dr. Huang · Biology", fav_school_lunch: "Fish and chips — ironic, looking back", best_mate: "Aroha Ngata", iconic_trend: "Teaching everyone fake Swedish", embarrassing_moment: "The exchange student who never left. Taught us all the wrong Swedish words.", secret_talent: "Could identify any shell on the beach by touch", message_younger_self: "Stay curious about the tide pools.", school_song: "Dancing Queen", is_hidden: false },
  { id: "d6", display_name: "Marcus Feld", nickname: "Encyclopedia", school_year: CLASS_YEAR, occupation: "Quiz show researcher", fav_teacher: "Mr. Okafor · Physics", fav_school_lunch: "Same sandwich every day — tuna", best_mate: "Ben O'Casey", iconic_trend: "Carrying a book to every class", embarrassing_moment: "Corrected the geography teacher. Was right. Got detention anyway.", secret_talent: "Memorised the entire library catalogue", message_younger_self: "Being right isn't always the point.", school_song: "Don't Stop Me Now", is_hidden: false },
  { id: "d7", display_name: "Aroha Ngata", nickname: "Ro", school_year: CLASS_YEAR, occupation: "Chef & café owner", fav_teacher: "Ms. Leilani · Art", fav_school_lunch: "Her own cookies — sold at interval", best_mate: "Sarah Lindqvist", iconic_trend: "Homemade baking at school", embarrassing_moment: "Sold cookies until the tuck shop filed a complaint.", secret_talent: "Could frost a cupcake blindfolded", message_younger_self: "Your art will outlast the hallways.", school_song: "I Will Survive", is_hidden: false },
  { id: "d8", display_name: "Ben O'Casey", nickname: "Bozza", school_year: CLASS_YEAR, occupation: "Airline pilot", fav_teacher: "Mrs. Bennett · English", fav_school_lunch: "Whatever arrived last at the canteen", best_mate: "Marcus Feld", iconic_trend: "The ramp thing — don't ask", embarrassing_moment: "Broke his arm doing 'the ramp thing'. Twice. Same ramp.", secret_talent: "Could sleep through anything, anywhere", message_younger_self: "Being late won't ruin your life. Promise.", school_song: "Learn to Fly", is_hidden: false },
];

/* ============================================================
   LIGHTWEIGHT SUPABASE REST CLIENT (no SDK needed)
   ============================================================ */
function authHeaders(token) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}
async function sbSelect(token) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, { headers: authHeaders(token) });
  if (!r.ok) throw new Error("Could not load profiles.");
  return r.json();
}
async function sbUpsert(token, row) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...authHeaders(token), Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error("Save failed — are you signed in?");
  return (await r.json())[0];
}
async function sbUpdate(token, id, patch) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...authHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("Update failed.");
  return (await r.json())[0];
}
async function sbMagicLink(email) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: window.location.origin } }),
  });
  if (!r.ok) throw new Error("Could not send the link. Check the email address.");
}
function photoPublicUrl(path) {
  if (!path || DEMO) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`;
}
async function sbUploadPhoto(token, userId, file) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type] || "jpg";
  const path = `${userId}/avatar.${ext}`;
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": file.type,
      "x-upsert": "true",
    },
    body: file,
  });
  if (!r.ok) throw new Error("Photo upload failed — try a smaller JPG or PNG.");
  return path;
}
async function sbDeletePhoto(token, path) {
  if (!path) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function sessionFromUrl() {
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const token = h.get("access_token");
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    window.history.replaceState(null, "", window.location.pathname);
    return { token, id: payload.sub, email: payload.email };
  } catch { return null; }
}

/* ============================================================
   SMALL HOOKS & HELPERS
   ============================================================ */
function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}
const Reveal = ({ children, delay = 0, className = "" }) => {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const initialsOf = (n) => (n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");

const SOCIAL_FIELDS = [
  { k: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/you" },
  { k: "instagram", label: "Instagram", placeholder: "instagram.com/you" },
  { k: "facebook", label: "Facebook", placeholder: "facebook.com/you" },
  { k: "x", label: "X (Twitter)", placeholder: "x.com/you" },
];

function socialHref(platform, value) {
  const v = (value || "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const path = v.replace(/^@/, "");
  const bases = {
    linkedin: "https://www.linkedin.com/in/",
    facebook: "https://www.facebook.com/",
    x: "https://x.com/",
    instagram: "https://www.instagram.com/",
  };
  return bases[platform] ? bases[platform] + path : v;
}

const STORY_FIELDS = [
  "fav_school_lunch", "best_mate", "iconic_trend", "embarrassing_moment",
  "secret_talent", "message_younger_self", "school_song",
];

const EMPTY_FORM = {
  display_name: "", nickname: "", school_year: CLASS_YEAR,
  current_city: "", occupation: "", fav_teacher: "",
  fav_school_lunch: "", best_mate: "", iconic_trend: "",
  embarrassing_moment: "", secret_talent: "", message_younger_self: "", school_song: "",
  linkedin: "", facebook: "", x: "", instagram: "",
  photo_path: null, photo_preview: null,
};

const TEST_FORM_PRESETS = [
  {
    display_name: "Suman Pandy",
    nickname: "Sumo",
    current_city: "Bangalore",
    occupation: "Software engineer in Bangalore",
    fav_teacher: "Mr. Banerjee · Mathematics",
    fav_school_lunch: "Canteen aloo paratha with green chutney — still unbeatable",
    best_mate: "Ruchi Kumari",
    iconic_trend: "Everyone humming film songs during PT period. By Year 12 half the class could lip-sync Pehla Nasha without missing a beat.",
    embarrassing_moment: "Walked into the wrong classroom during an inter-house quiz and answered three questions before realising it wasn't our team.",
    secret_talent: "Could recite multiplication tables backwards faster than anyone in the class could forwards.",
    message_younger_self: "Stop skipping Hindi homework — those Bollywood lyrics will get you through more awkward reunions than you think.",
    school_song: "Pehla Nasha — Udit Narayan & Sadhana Sargam (Jo Jeeta Wohi Sikandar, 1992)",
    linkedin: "linkedin.com/in/sumanpandy",
    instagram: "@sumo_from_school",
  },
  {
    display_name: "Ruchi Kumari",
    nickname: "Ruch",
    current_city: "New Delhi",
    occupation: "Paediatrician at AIIMS",
    fav_teacher: "Mrs. Sharma · Hindi",
    fav_school_lunch: "Maggi from the stall outside the gate — strictly against school rules",
    best_mate: "Suman Pandy",
    iconic_trend: "Trading DDLJ dialogues and debating whether Raj or Rahul was the bigger heartthrob. The girls' wing was team DDLJ; the boys pretended they weren't.",
    embarrassing_moment: "Forgot my lines in the annual day play and improvised with a Kuch Kuch Hota Hai monologue. The principal thought it was scripted.",
    secret_talent: "Could paint mehndi designs on everyone's hands during free period without looking down.",
    message_younger_self: "That science stream choice scares you now but trust me — you'll love what you become.",
    school_song: "Tujhe Dekha To — Kumar Sanu & Lata Mangeshkar (Dilwale Dulhania Le Jayenge, 1995)",
    linkedin: "linkedin.com/in/ruchikumari",
    x: "@ruch_from_year12",
  },
];

const fieldInputCls =
  "w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 focus:border-emerald-600 transition-shadow";
const fieldTextareaCls =
  "w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-900 placeholder-zinc-400 resize-y focus:outline-none focus:ring-2 focus:ring-emerald-600/60 focus:border-emerald-600 transition-shadow";

function ProfileInput({ label, k, type = "text", placeholder = "", full = false, form, setF }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[13px] font-medium text-zinc-500 mb-1.5">{label}</span>
      <input
        type={type}
        value={form[k] ?? ""}
        onChange={setF(k)}
        placeholder={placeholder}
        className={fieldInputCls}
      />
    </label>
  );
}

function ProfileMemory({ label, k, placeholder = "A moment worth keeping…", form, setF }) {
  return (
    <label className="block sm:col-span-2">
      <span className="block text-[13px] font-medium text-zinc-500 mb-1.5">{label}</span>
      <textarea
        rows={2}
        maxLength={400}
        value={form[k] ?? ""}
        onChange={setF(k)}
        placeholder={placeholder}
        className={fieldTextareaCls}
      />
    </label>
  );
}

function ProfileAvatar({ profile, size = "md", className = "" }) {
  const sz = { sm: "h-12 w-12 text-base", md: "h-14 w-14 text-lg" };
  const src = profile.photo_preview || photoPublicUrl(profile.photo_path);
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${sz[size]} shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span className={`grid ${sz[size]} shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white font-semibold ${className}`}>
      {initialsOf(profile.display_name)}
    </span>
  );
}

function ProfilePhotoUpload({ form, pendingPhoto, setPendingPhoto, photoRemoved, setPhotoRemoved, onError }) {
  const fileRef = useRef(null);
  const preview = pendingPhoto
    ? URL.createObjectURL(pendingPhoto)
    : photoRemoved
      ? null
      : (form.photo_preview || photoPublicUrl(form.photo_path));

  const pick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      onError("Please choose a JPG, PNG, WebP, or GIF.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      onError("Photo must be 2 MB or smaller.");
      return;
    }
    setPendingPhoto(file);
    setPhotoRemoved(false);
    e.target.value = "";
  };

  const remove = () => {
    setPendingPhoto(null);
    setPhotoRemoved(true);
  };

  return (
    <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-5">
      <div className="relative shrink-0">
        {preview ? (
          <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white text-xl font-semibold ring-2 ring-white shadow">
            {initialsOf(form.display_name) || "?"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-800">Profile pic <span className="font-normal text-zinc-400">(optional)</span></p>
        <p className="mt-1 text-[13px] text-zinc-500 leading-relaxed">A recent photo helps old friends recognise you. Stored in Supabase Storage — not in the database.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} onChange={pick} className="sr-only" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:border-zinc-300 transition-colors"
          >
            <Camera size={14} /> {preview ? "Change photo" : "Add photo"}
          </button>
          {(preview || form.photo_path || form.photo_preview) && !photoRemoved && (
            <button
              type="button"
              onClick={remove}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3.5 py-2 text-[13px] font-medium text-zinc-500 hover:border-red-200 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // { id, email, token? }
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);   // profile in detail modal
  const [form, setForm] = useState(EMPTY_FORM);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [toast, setToast] = useState(null);
  const [pulseId, setPulseId] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authState, setAuthState] = useState("idle"); // idle | sending | sent
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const editRef = useRef(null);
  const bookRef = useRef(null);
  const testPresetIdx = useRef(0);

  const notify = useCallback((msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 3200);
  }, []);

  /* ---------- load ---------- */
  useEffect(() => {
    (async () => {
      if (DEMO) {
        if (new URLSearchParams(window.location.search).has("reset")) {
          store.del("yb_email");
          store.del("yb_profile");
          store.del("yb_session");
          window.history.replaceState({}, "", window.location.pathname);
        }
        const savedEmail = store.get("yb_email");
        let mine = null;
        try { mine = JSON.parse(store.get("yb_profile") || "null"); } catch {}
        if (savedEmail) {
          setMe({ id: "demo-me", email: savedEmail });
          setIsAdmin(savedEmail.startsWith("admin"));
        }
        setTimeout(() => { // let the skeletons breathe
          setProfiles(mine ? [...SEED, mine] : [...SEED]);
          if (mine) { setForm({ ...EMPTY_FORM, ...mine }); setPendingPhoto(null); setPhotoRemoved(false); }
          setLoading(false);
        }, 700);
        // one simulated live update, so the room feels inhabited
        setTimeout(() => {
          setProfiles((ps) => ps.map((p) => p.id === "d8" ? { ...p, occupation: "Airline pilot — finally on time" } : p));
          setPulseId("d8");
          notify("Ben O'Casey just updated his profile");
          setTimeout(() => setPulseId(null), 1800);
        }, 8000);
        return;
      }
      // live mode
      const fromUrl = sessionFromUrl();
      const saved = fromUrl || JSON.parse(store.get("yb_session") || "null");
      if (saved) { store.set("yb_session", JSON.stringify(saved)); setMe(saved); }
      try {
        const rows = await sbSelect(saved?.token);
        setProfiles(rows);
        const mine = saved ? rows.find((r) => r.id === saved.id) : null;
        if (mine) { setForm({ ...EMPTY_FORM, ...mine }); setPendingPhoto(null); setPhotoRemoved(false); setIsAdmin(!!mine.is_admin); }
      } catch (e) { notify(e.message); }
      setLoading(false);
    })();
  }, [notify]);

  /* gentle polling keeps everyone current in live mode */
  useEffect(() => {
    if (DEMO || !me) return;
    const t = setInterval(async () => {
      try {
        const rows = await sbSelect(me.token);
        setProfiles((prev) => {
          const changed = rows.find((r) => {
            const old = prev.find((p) => p.id === r.id);
            return old && old.updated_at !== r.updated_at && r.id !== me.id;
          });
          if (changed) { setPulseId(changed.id); notify(`${changed.display_name} just updated their profile`); setTimeout(() => setPulseId(null), 1800); }
          return rows;
        });
      } catch {}
    }, 15000);
    return () => clearInterval(t);
  }, [me, notify]);

  /* ---------- derived ---------- */
  const visible = profiles
    .filter((p) => !p.is_hidden || isAdmin || (me && p.id === me.id))
    .filter((p) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (p.display_name || "").toLowerCase().includes(q) || (p.nickname || "").toLowerCase().includes(q);
    })
    .sort((a, b) => (a.display_name || "").localeCompare(b.display_name || ""));

  const allMemories = profiles
    .filter((p) => !p.is_hidden)
    .flatMap((p) => STORY_FIELDS
      .map((k) => p[k])
      .filter(Boolean)
      .map((m) => ({ text: m, by: p.display_name, year: p.school_year })));
  const completed = profiles.filter((p) => p.display_name && p.occupation).length;
  const cardQuote = (p) => p.embarrassing_moment || p.message_younger_self || p.secret_talent || p.iconic_trend;

  /* ---------- actions ---------- */
  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const signIn = async (e) => {
    e.preventDefault();
    const email = authEmail.trim();
    if (!email) return;
    if (DEMO) {
      store.set("yb_email", email);
      setMe({ id: "demo-me", email });
      setIsAdmin(email.startsWith("admin"));
      let mine = profiles.find((p) => p.id === "demo-me");
      if (!mine) {
        try { mine = JSON.parse(store.get("yb_profile") || "null"); } catch {}
      }
      if (mine) {
        setForm({ ...EMPTY_FORM, ...mine });
        setPendingPhoto(null);
        setPhotoRemoved(false);
      }
      setAuthState("idle");
      notify("Signed in. Your profile is ready to edit.");
      scrollTo(editRef);
      return;
    }
    setAuthState("sending");
    try { await sbMagicLink(email); setAuthState("sent"); }
    catch (err) { setAuthState("idle"); notify(err.message); }
  };

  const signOut = () => {
    setMe(null); setIsAdmin(false); setForm(EMPTY_FORM);
    setPendingPhoto(null); setPhotoRemoved(false);
    store.del("yb_email"); store.del("yb_session");
    notify("Signed out.");
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!me) { scrollTo(editRef); return; }
    setSaveState("saving");
    let photo_path = form.photo_path;
    let photo_preview = form.photo_preview;
    try {
      if (DEMO) {
        if (photoRemoved) {
          photo_path = null;
          photo_preview = null;
        } else if (pendingPhoto) {
          photo_preview = await fileToDataUrl(pendingPhoto);
        }
      } else {
        if (photoRemoved && form.photo_path) {
          await sbDeletePhoto(me.token, form.photo_path);
          photo_path = null;
        } else if (pendingPhoto) {
          if (form.photo_path) await sbDeletePhoto(me.token, form.photo_path);
          photo_path = await sbUploadPhoto(me.token, me.id, pendingPhoto);
        }
        photo_preview = null;
      }
      const row = {
        ...form,
        id: me.id,
        school_year: CLASS_YEAR,
        photo_path,
        photo_preview,
      };
      if (DEMO) {
        await new Promise((r) => setTimeout(r, 650));
        store.set("yb_profile", JSON.stringify(row));
        setProfiles((ps) => {
          const i = ps.findIndex((p) => p.id === me.id);
          return i >= 0 ? ps.map((p) => (p.id === me.id ? row : p)) : [...ps, row];
        });
      } else {
        const { photo_preview: _drop, ...dbRow } = row;
        const saved = await sbUpsert(me.token, dbRow);
        setProfiles((ps) => {
          const i = ps.findIndex((p) => p.id === saved.id);
          return i >= 0 ? ps.map((p) => (p.id === saved.id ? saved : p)) : [...ps, saved];
        });
        row.id = saved.id;
      }
      setForm({ ...EMPTY_FORM, ...row });
      setPendingPhoto(null);
      setPhotoRemoved(false);
      setPulseId(me.id); setTimeout(() => setPulseId(null), 1800);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2600);
    } catch (err) { setSaveState("idle"); notify(err.message); }
  };

  const toggleHidden = async (p) => {
    const next = !p.is_hidden;
    try {
      if (!DEMO) await sbUpdate(me.token, p.id, { is_hidden: next });
      setProfiles((ps) => ps.map((x) => (x.id === p.id ? { ...x, is_hidden: next } : x)));
      setSelected((s) => (s && s.id === p.id ? { ...s, is_hidden: next } : s));
      notify(next ? "Profile hidden from the group." : "Profile visible again.");
    } catch (err) { notify(err.message); }
  };

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const fillTestData = () => {
    const preset = TEST_FORM_PRESETS[testPresetIdx.current % TEST_FORM_PRESETS.length];
    testPresetIdx.current += 1;
    setForm((f) => ({
      ...EMPTY_FORM,
      ...preset,
      photo_path: f.photo_path,
      photo_preview: f.photo_preview,
    }));
    notify(`Filled with test data — ${preset.display_name}`);
  };

  /* ============================================================ RENDER */
  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        html{scroll-behavior:smooth}
        @media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} *{animation-duration:.01ms!important;transition-duration:.01ms!important} }
        @keyframes floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes pulse-ring { 0%{box-shadow:0 0 0 0 rgba(5,150,105,.35)} 100%{box-shadow:0 0 0 14px rgba(5,150,105,0)} }
        .pulse-live{ animation: pulse-ring 1.6s ease-out; }
      `}</style>

      {/* ================= NAV ================= */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-zinc-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-700 text-white">
              <GraduationCap size={17} strokeWidth={2.2} />
            </span>
            <span className="font-semibold tracking-tight">The Yearbook</span>
            <span className="hidden sm:inline-flex items-center gap-1.5 ml-2 rounded-full border border-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-500">
              <Lock size={11} /> Private group
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <button onClick={() => scrollTo(bookRef)} className="hidden sm:block px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Yearbook</button>
            <button onClick={() => scrollTo(editRef)} className="hidden sm:block px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">My details</button>
            {me ? (
              <button onClick={signOut} className="px-3.5 py-2 text-sm font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:-translate-y-px transition-all">Sign out</button>
            ) : (
              <button onClick={() => scrollTo(editRef)} className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-700 text-white shadow-sm shadow-emerald-700/20 hover:bg-emerald-800 hover:-translate-y-px transition-all">Sign in</button>
            )}
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-5 text-center pt-36 pb-10 sm:pt-44 sm:pb-12">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-[12.5px] font-medium text-emerald-800">
              <Sparkles size={13} /> Invite-only · Made by us, for us
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="mt-7 text-5xl sm:text-7xl font-bold tracking-tight leading-[1.04]">
              The friends we<br />grew up with.
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-6 text-lg sm:text-xl leading-relaxed text-zinc-500 max-w-xl mx-auto">
              A private yearbook for our class. Keep your page current, read everyone's memories, and stay found — no feeds, no ads, just us.
            </p>
          </Reveal>
          <Reveal delay={270}>
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button onClick={() => scrollTo(editRef)}
                className="group inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-emerald-700/20 hover:bg-emerald-800 hover:-translate-y-0.5 transition-all">
                {me ? "Update my profile" : "Add my details"}
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </button>
              <button onClick={() => scrollTo(bookRef)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700/30 px-6 py-3.5 text-[15px] font-semibold text-emerald-800 hover:bg-emerald-50 hover:-translate-y-0.5 transition-all">
                View yearbook
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={360}>
          <div className="relative mx-auto max-w-4xl px-5 pb-24 sm:pb-32">
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200/80 shadow-xl shadow-zinc-200/50 aspect-[4/3] sm:aspect-[16/10]">
              <img
                src="/hero-school-gate.png"
                alt="Saraswati Vidya Mandir school entrance gate, Musabani"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ================= INTRO ================= */}
      <section className="border-t border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24 grid gap-10 md:grid-cols-3">
          <Reveal className="md:col-span-1">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">One quiet page,<br />kept by all of us.</h2>
          </Reveal>
          <Reveal delay={100} className="md:col-span-2 grid gap-8 sm:grid-cols-2">
            <div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white border border-zinc-200 text-emerald-700 mb-3"><BookOpen size={16} /></span>
              <h3 className="font-semibold">Your page, your words</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-500">Everyone edits only their own entry — name, nickname, what you're up to now, and the memories worth writing down.</p>
            </div>
            <div>
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white border border-zinc-200 text-emerald-700 mb-3"><Shield size={16} /></span>
              <h3 className="font-semibold">Group-only, always</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-zinc-500">Nothing here is public. Only signed-in classmates can see the yearbook — no feeds, no strangers.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= YEARBOOK ================= */}
      <section ref={bookRef} className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Class of {CLASS_YEAR}</p>
                <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Everyone, as they are now</h2>
              </div>
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search a name or nickname"
                  aria-label="Search classmates"
                  className="h-11 w-full sm:w-72 rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-[15px] placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 focus:border-emerald-600 transition-shadow"
                />
              </div>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-zinc-100 p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-zinc-100 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/3 rounded bg-zinc-100 animate-pulse" />
                      <div className="h-3 w-1/3 rounded bg-zinc-100 animate-pulse" />
                    </div>
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="h-3 w-full rounded bg-zinc-100 animate-pulse" />
                    <div className="h-3 w-4/5 rounded bg-zinc-100 animate-pulse" />
                  </div>
                </div>
              ))}

            {!loading && visible.map((p, i) => (
              <Reveal key={p.id} delay={Math.min(i * 60, 360)}>
                <button
                  onClick={() => setSelected(p)}
                  className={`group w-full text-left rounded-2xl border bg-white p-6 transition-all duration-300
                              hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/70 hover:border-zinc-200
                              ${p.is_hidden ? "border-dashed border-zinc-300 opacity-70" : "border-zinc-100"}
                              ${pulseId === p.id ? "pulse-live border-emerald-300" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <ProfileAvatar profile={p} size="sm" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">
                        {p.display_name || "Unnamed"}
                        {p.nickname && <span className="text-zinc-400 font-normal"> · "{p.nickname}"</span>}
                      </p>
                      <p className="text-[13px] text-zinc-500 truncate">
                        Class of {CLASS_YEAR}
                        {p.occupation ? ` · ${p.occupation}` : ""}
                        {p.current_city ? ` · ${p.current_city}` : ""}
                      </p>
                    </div>
                  </div>
                  {(cardQuote(p) || p.fav_teacher) && (
                    <div className="mt-4 border-t border-zinc-100 pt-4">
                      {cardQuote(p) && <p className="text-[13.5px] leading-relaxed text-zinc-500 line-clamp-2">"{cardQuote(p)}"</p>}
                      {p.fav_teacher && <p className="mt-2 text-[12.5px] text-zinc-400">Fav teacher · {p.fav_teacher}</p>}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400">
                      <Lock size={11} /> Group only
                    </span>
                    <span className="text-[13px] font-medium text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">Open →</span>
                  </div>
                  {p.is_hidden && <p className="mt-3 text-[12px] font-medium text-amber-600">Hidden from the group (admin)</p>}
                </button>
              </Reveal>
            ))}

            {!loading && visible.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-zinc-200 p-14 text-center text-zinc-400">
                No one matches that search. Maybe they changed their name and fled.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================= EDIT DETAILS ================= */}
      <section ref={editRef} className="scroll-mt-20 border-t border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24 grid gap-12 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Your entry</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Keep your page current</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-zinc-500">
              Only you can edit this. Save whenever life changes — everyone sees the update straight away, no refresh needed.
            </p>
            {!me && (
              <form onSubmit={signIn} className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <p className="font-semibold flex items-center gap-2"><Mail size={16} className="text-emerald-700" /> Sign in first</p>
                <p className="mt-1.5 text-[13.5px] text-zinc-500 leading-relaxed">
                  {DEMO ? "Demo mode: enter any email to try it. Use an email starting with \"admin\" to preview moderation." : "We'll email you a one-time link. No passwords."}
                </p>
                <div className="mt-4 flex gap-2">
                  <input
                    type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@somewhere.com"
                    className="h-12 flex-1 rounded-xl border border-zinc-200 px-4 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/60 focus:border-emerald-600"
                  />
                  <button type="submit" disabled={authState === "sending"}
                    className="h-12 px-5 rounded-xl bg-emerald-700 text-white font-semibold shadow-sm shadow-emerald-700/20 hover:bg-emerald-800 transition-colors disabled:opacity-60 inline-flex items-center gap-2">
                    {authState === "sending" ? <Loader2 size={16} className="animate-spin" /> : null}
                    {authState === "sent" ? "Link sent" : DEMO ? "Sign in" : "Send link"}
                  </button>
                </div>
                {authState === "sent" && <p className="mt-3 text-[13px] text-emerald-700 font-medium">Check your inbox — the link signs you straight in.</p>}
              </form>
            )}
            {me && (
              <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[13.5px] font-medium text-emerald-800">
                <Check size={14} /> Signed in as {me.email}{isAdmin ? " · admin" : ""}
              </p>
            )}
          </Reveal>

          <Reveal delay={120} className="lg:col-span-3">
            <form onSubmit={saveProfile} className={`rounded-2xl border border-zinc-200 bg-white p-7 sm:p-8 shadow-sm transition-opacity ${me ? "" : "opacity-50 pointer-events-none select-none"}`} aria-disabled={!me}>
              <div className="grid gap-5 sm:grid-cols-2">
                <ProfilePhotoUpload
                  form={form}
                  pendingPhoto={pendingPhoto}
                  setPendingPhoto={setPendingPhoto}
                  photoRemoved={photoRemoved}
                  setPhotoRemoved={setPhotoRemoved}
                  onError={notify}
                />
                <ProfileInput label="Name" k="display_name" placeholder="Your full name" form={form} setF={setF} />
                <ProfileInput label="Nick name" k="nickname" placeholder='What we actually called you' form={form} setF={setF} />
                <div className="block">
                  <span className="block text-[13px] font-medium text-zinc-500 mb-1.5">Year</span>
                  <p className="h-12 flex items-center px-4 rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-700">Class of {CLASS_YEAR}</p>
                </div>
                <ProfileInput label="Occupation" k="occupation" placeholder="What you do now" form={form} setF={setF} />
                <ProfileInput label="Current city" k="current_city" placeholder="e.g. Auckland — city only, no street address" form={form} setF={setF} />
                <ProfileInput label="Fav teacher" k="fav_teacher" placeholder="The one who got it" form={form} setF={setF} />
                <ProfileInput label="Favorite school lunch" k="fav_school_lunch" placeholder="The one you'd still queue for" form={form} setF={setF} />
                <ProfileInput label="Best mate at school" k="best_mate" placeholder="Your ride-or-die" form={form} setF={setF} />
                <ProfileMemory label="Most iconic school trend" k="iconic_trend" placeholder="What everyone was doing…" form={form} setF={setF} />
                <ProfileMemory label="Most embarrassing school moment" k="embarrassing_moment" placeholder="The one we still bring up…" form={form} setF={setF} />
                <ProfileMemory label="Secret talent nobody knew about" k="secret_talent" placeholder="Your hidden superpower…" form={form} setF={setF} />
                <ProfileMemory label="One message to your younger self" k="message_younger_self" placeholder="What would you tell 16-year-old you?" form={form} setF={setF} />
                <ProfileInput label="One song that reminds you of school days" k="school_song" placeholder="Track and artist" full form={form} setF={setF} />
                <div className="sm:col-span-2 pt-2">
                  <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Social media</p>
                  <p className="mt-1 text-[12.5px] text-zinc-400">Optional — paste a profile link or handle so classmates can find you.</p>
                </div>
                {SOCIAL_FIELDS.map(({ k, label, placeholder }) => (
                  <ProfileInput key={k} label={label} k={k} placeholder={placeholder} form={form} setF={setF} />
                ))}
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={saveState === "saving" || !me}
                  className={`inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg transition-all disabled:opacity-70
                    ${saveState === "saved" ? "bg-emerald-600 shadow-emerald-600/20" : "bg-emerald-700 shadow-emerald-700/20 hover:bg-emerald-800 hover:-translate-y-0.5"}`}>
                  {saveState === "saving" && <Loader2 size={16} className="animate-spin" />}
                  {saveState === "saved" && <Check size={16} />}
                  {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save my details"}
                </button>
                {DEMO && me && (
                  <button
                    type="button"
                    onClick={fillTestData}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 text-[15px] font-medium text-zinc-700 hover:border-zinc-300 hover:-translate-y-0.5 transition-all"
                  >
                    <Sparkles size={16} className="text-emerald-700" /> Fill with test data
                  </button>
                )}
                {saveState === "saved" && <span className="text-[13.5px] text-zinc-500">Your page is live for the group.</span>}
              </div>
            </form>
          </Reveal>
        </div>
      </section>

      {/* ================= MEMORIES ================= */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Memories</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">The stories we still tell</h2>
          </Reveal>
          <div className="mt-10 columns-1 sm:columns-2 lg:columns-3 gap-5 [&>*]:mb-5">
            {(loading ? [] : allMemories).slice(0, 12).map((m, i) => (
              <Reveal key={i} delay={Math.min(i * 50, 300)}>
                <figure className="break-inside-avoid rounded-2xl border border-zinc-100 bg-white p-6 hover:border-zinc-200 hover:shadow-md hover:shadow-zinc-200/60 transition-all">
                  <Quote size={16} className="text-emerald-600" />
                  <blockquote className="mt-3 text-[15px] leading-relaxed text-zinc-700">{m.text}</blockquote>
                  <figcaption className="mt-4 text-[12.5px] font-medium text-zinc-400">{m.by} · Class of {CLASS_YEAR.slice(-2)}</figcaption>
                </figure>
              </Reveal>
            ))}
            {!loading && allMemories.length === 0 && (
              <p className="text-zinc-400">No memories written yet — be the first.</p>
            )}
          </div>
        </div>
      </section>

      {/* ================= CLASS MOMENTS ================= */}
      <section className="border-t border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:py-24">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Our class moments</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">Small numbers, big history</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {[
              { icon: Users, n: profiles.filter((p) => !p.is_hidden).length, label: "Classmates found", sub: "and counting — send the link around" },
              { icon: Heart, n: allMemories.length, label: "Memories written down", sub: "before we forget the details" },
              { icon: BookOpen, n: completed, label: "Profiles completed", sub: "name, story and all" },
            ].map((s, i) => (
              <Reveal key={s.label} delay={i * 90}>
                <div className="rounded-2xl border border-zinc-200 bg-white p-7 hover:-translate-y-1 hover:shadow-lg hover:shadow-zinc-200/60 transition-all">
                  <s.icon size={18} className="text-emerald-700" />
                  <p className="mt-4 text-4xl font-bold tracking-tight">{loading ? "—" : s.n}</p>
                  <p className="mt-1 font-medium">{s.label}</p>
                  <p className="mt-1 text-[13.5px] text-zinc-500">{s.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PRIVACY ================= */}
      <section className="border-t border-zinc-100">
        <div className="mx-auto max-w-3xl px-5 py-20 sm:py-24 text-center">
          <Reveal>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700"><Shield size={20} /></span>
            <h2 className="mt-5 text-2xl sm:text-3xl font-bold tracking-tight">Private by design</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-zinc-500">
              This page is for our group and no one else. You sign in with a one-time email link, and you can only ever edit your own entry. What you share here stays within the class.
            </p>
            <p className="mt-3 text-[13.5px] text-zinc-400">Access is enforced in the database itself, not just the page you're looking at.</p>
          </Reveal>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-700 text-white"><GraduationCap size={17} /></span>
              <div>
                <p className="font-semibold tracking-tight leading-tight">The Yearbook</p>
                <p className="text-[12.5px] text-zinc-400">Class of {CLASS_YEAR}</p>
              </div>
            </div>
            <nav className="grid grid-cols-2 gap-x-14 gap-y-2 text-[14px]">
              {[["About", bookRef], ["My details", editRef], ["Privacy", null], ["Help", null]].map(([label, ref]) => (
                <button key={label} onClick={() => ref && scrollTo(ref)} className="text-left text-zinc-500 hover:text-zinc-900 transition-colors">{label}</button>
              ))}
            </nav>
          </div>
          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-zinc-200/70 pt-6 text-[12.5px] text-zinc-400">
            <p>© {new Date().getFullYear()} The Yearbook. Kept by the class, for the class.</p>
            <p>{DEMO ? "Demo mode — nothing leaves your browser" : me ? `Signed in as ${me.email}` : "Group-only access"}</p>
          </div>
        </div>
      </footer>

      {/* ================= PROFILE MODAL ================= */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm" onClick={() => setSelected(null)} role="dialog" aria-modal="true">
          <div className="w-full max-w-lg max-h-[86vh] overflow-y-auto rounded-2xl bg-white p-7 sm:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <ProfileAvatar profile={selected} size="md" />
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{selected.display_name}</h3>
                  {selected.nickname && <p className="text-[14px] text-zinc-500">"{selected.nickname}"</p>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"><X size={18} /></button>
            </div>

            <dl className="mt-6 space-y-4">
              {[
                ["Year", `Class of ${CLASS_YEAR}`],
                ["Current city", selected.current_city],
                ["Occupation", selected.occupation],
                ["Fav teacher", selected.fav_teacher],
                ["Favorite school lunch", selected.fav_school_lunch],
                ["Best mate at school", selected.best_mate],
                ["One song", selected.school_song],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-6 border-b border-zinc-100 pb-3">
                  <dt className="text-[13px] font-medium text-zinc-400">{k}</dt>
                  <dd className="text-[14.5px] font-medium text-right">{v}</dd>
                </div>
              ))}
            </dl>

            {SOCIAL_FIELDS.filter(({ k }) => selected[k]?.trim()).length > 0 && (
              <div className="mt-6">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Social media</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SOCIAL_FIELDS.filter(({ k }) => selected[k]?.trim()).map(({ k, label }) => (
                    <a
                      key={k}
                      href={socialHref(k, selected[k])}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-[13.5px] font-medium text-emerald-800 hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
                    >
                      {label}
                      <ExternalLink size={13} className="opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {[
              ["Most iconic school trend", selected.iconic_trend],
              ["Most embarrassing school moment", selected.embarrassing_moment],
              ["Secret talent nobody knew about", selected.secret_talent],
              ["One message to your younger self", selected.message_younger_self],
            ].filter(([, v]) => v).length > 0 && (
              <div className="mt-6">
                <p className="text-[13px] font-semibold uppercase tracking-widest text-emerald-700">Stories</p>
                <div className="mt-3 space-y-3">
                  {[
                    ["Most iconic school trend", selected.iconic_trend],
                    ["Most embarrassing school moment", selected.embarrassing_moment],
                    ["Secret talent nobody knew about", selected.secret_talent],
                    ["One message to your younger self", selected.message_younger_self],
                  ].filter(([, v]) => v).map(([label, text]) => (
                    <div key={label} className="rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                      <p className="text-[12px] font-medium text-zinc-400">{label}</p>
                      <p className="mt-1 text-[14.5px] leading-relaxed text-zinc-600">"{text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isAdmin && me && selected.id !== me.id && (
              <div className="mt-6 flex items-center justify-between rounded-xl border border-dashed border-zinc-300 p-4">
                <span className="text-[12px] font-semibold uppercase tracking-widest text-zinc-400">Admin</span>
                <button onClick={() => toggleHidden(selected)}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-300 transition-colors">
                  {selected.is_hidden ? <><Eye size={14} /> Unhide profile</> : <><EyeOff size={14} /> Hide profile</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TOAST ================= */}
      <div aria-live="polite" className={`fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 transition-all duration-300 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"}`}>
        <div className="flex items-center gap-2.5 rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {toast}
        </div>
      </div>
    </div>
  );
}