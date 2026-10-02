import {
  useState,
  useEffect,
  isValidElement,
  cloneElement,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Shield,
  HeartPulse,
  Target,
  ClipboardList,
  ArrowLeft,
  Calendar,
  Check,
  KeyRound,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { getUserSettings, saveUserSettings, getAppointments } from "../../lib/api";
import { AVATAR_COLORS, avatarColor } from "../../utils/avatar";
import Spinner from "../../components/ui/Spinner";
import { useToast } from "../../components/ui/Toast";
import PanelHead from "../../components/ui/PanelHead";
import { validateEmergencyContact, validatePasswordChange } from "../../utils/validation";
import { validate } from "../../lib/validate";
import { profileSchema, goalSchema, MAX_GOALS } from "../../lib/schemas";
import { friendlyError, codeOf } from "../../utils/errors";
import { focusById } from "../../utils/dom";
import type { Appointment, EmergencyContact, FieldErrors } from "../../types";
import { formatDateTime } from "../../utils/dates";

const PRESET_GOALS = [
  "Manage academic stress and burnout",
  "Improve sleep quality and habits",
  "Build daily mindfulness and focus",
  "Overcome social anxiety and isolation",
  "Keep a healthy work-life balance",
  "Boost self-esteem and confidence",
  "Develop healthy ways to cope with emotions",
  "Improve how I communicate with others",
];

type TabId = "profile" | "password" | "privacy" | "emergency" | "goals" | "sessions";

/**
 * Badge classes for an appointment status in the session history.
 * @param {string} [status]
 * @returns {string} Tailwind classes
 */
function statusTone(status?: string): string {
  const s = (status || "").toLowerCase();
  if (s.includes("confirm"))
    return "border-[color:var(--mb-safe)] bg-[color:var(--mb-safe-bg)] text-[color:var(--mb-safe)]";
  if (s.includes("pending"))
    return "border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] text-[color:var(--mb-warn)]";
  if (s.includes("declin") || s.includes("cancel"))
    return "border-[color:var(--mb-urgent)] bg-[color:var(--mb-urgent-bg)] text-[color:var(--mb-urgent)]";
  return "border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]";
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
}

function Field({ id, label, hint, error, required, children }: FieldProps) {
  // Link the message to the input so screen readers read it with the field
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? `${id}-error` : undefined,
      })
    : children;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-bold text-[color:var(--mb-ink)]">
        {label}
        {required && <span aria-hidden="true"> *</span>}
        {hint && <span className="ml-1 font-normal text-[color:var(--mb-muted)]">({hint})</span>}
      </label>
      {control}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 font-medium text-[color:var(--mb-urgent)]">
          {error}
        </p>
      )}
    </div>
  );
}

interface SaveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  saving: boolean;
  savingLabel?: string;
}

function SaveButton({ saving, children, savingLabel = "Saving…", ...rest }: SaveButtonProps) {
  return (
    <div className="flex justify-end pt-2">
      <button disabled={saving} className="mb-btn mb-btn-solid w-full sm:w-auto" {...rest}>
        {saving && <Spinner size={16} />}
        {saving ? savingLabel : children}
      </button>
    </div>
  );
}

export default function UserSettings() {
  const { currentUser, userRole, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarId, setAvatarId] = useState("cyan");
  const [useGoogleAvatar, setUseGoogleAvatar] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Emergency contact
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
    name: "",
    relationship: "Parent",
    phone: "",
    alternatePhone: "",
    notes: "",
  });

  // Goals
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");

  // Sessions
  const [appointmentsList, setAppointmentsList] = useState<Appointment[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);

  const isGoogleUser = currentUser?.providerData?.some((p) => p.providerId === "google.com");
  const isStudent = (userRole || "student") === "student";

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await getUserSettings(currentUser.uid);
        if (!isMounted) return;

        if (data) {
          setName(data.name || currentUser.displayName || "");
          setPhone(data.phone || "");
          setBio(data.bio || "");
          setAvatarId(data.avatarGradient || "cyan");
          // First visit with a Google photo: use it by default
          setUseGoogleAvatar(data.useGoogleAvatar !== undefined ? data.useGoogleAvatar : !!currentUser?.photoURL);
          if (data.emergencyContact) setEmergencyContact((prev) => ({ ...prev, ...data.emergencyContact }));
          if (Array.isArray(data.wellnessGoals)) setSelectedGoals(data.wellnessGoals);
        } else {
          setName(currentUser.displayName || "");
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
        if (isMounted) showFeedback("error", "Could not load your settings. Reload the page to try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load session history when its tab is opened
  useEffect(() => {
    if (activeTab !== "sessions" || !currentUser) return undefined;
    {
      let isMounted = true;
      setLoadingApts(true);
      getAppointments()
        .then((data) => {
          if (isMounted) setAppointmentsList(data);
        })
        .catch((err: unknown) => console.error("Error fetching sessions:", err))
        .finally(() => {
          if (isMounted) setLoadingApts(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, currentUser]);

  const toast = useToast();
  const showFeedback = (type: "success" | "error", message: string) =>
    type === "success" ? toast.success(message) : toast.error(message);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const parsed = validate(profileSchema, { name, phone, bio });
    if (!parsed.ok) {
      const errors = parsed.error.fieldErrors ?? {};
      setFieldErrors(errors);
      focusById(errors["name"] ? "set-name" : errors["phone"] ? "set-phone" : "set-bio");
      return;
    }
    setFieldErrors({});
    const clean = parsed.data;
    setSaving(true);
    try {
      if (currentUser && currentUser.displayName !== name) {
        await updateProfile(currentUser, { displayName: clean.name });
      }
      await saveUserSettings(currentUser.uid, {
        name: clean.name,
        phone: clean.phone,
        bio: clean.bio,
        avatarGradient: avatarId,
        useGoogleAvatar,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Profile saved.");
    } catch (err) {
      console.error(err);
      showFeedback("error", friendlyError(err, "Could not save your profile."));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    const errors = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const ids: Record<string, string> = {
        currentPassword: "set-current-pw",
        newPassword: "set-new-pw",
        confirmPassword: "set-confirm-pw",
      };
      focusById(ids[Object.keys(errors)[0] ?? ""]);
      return;
    }

    setPasswordLoading(true);
    try {
      const cred = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, cred);
      await updatePassword(currentUser, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showFeedback("success", "Password updated.");
    } catch (err) {
      console.error(err);
      const code = codeOf(err);
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setFieldErrors({ currentPassword: "Your current password is incorrect." });
        focusById("set-current-pw");
      } else {
        showFeedback("error", friendlyError(err, "Could not update your password."));
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveEmergencyContact = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const errors = validateEmergencyContact(emergencyContact);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      const ids: Record<string, string> = { name: "ec-name", phone: "ec-phone", alternatePhone: "ec-alt" };
      focusById(ids[Object.keys(errors)[0] ?? ""]);
      return;
    }
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        emergencyContact: {
          ...emergencyContact,
          name: emergencyContact.name.trim(),
          phone: emergencyContact.phone.trim(),
          alternatePhone: (emergencyContact.alternatePhone || "").trim(),
        },
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Emergency contact saved.");
    } catch (err) {
      showFeedback("error", friendlyError(err, "Could not save your emergency contact."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleGoal = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else if (selectedGoals.length >= MAX_GOALS) {
      showFeedback("error", `You can pick up to ${MAX_GOALS} goals at a time.`);
    } else {
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleAddCustomGoal = (e: FormEvent) => {
    e.preventDefault();
    const parsedGoal = validate(goalSchema, customGoal);
    if (!parsedGoal.ok) return; // blank: nothing to add
    const goal = parsedGoal.data;
    if (selectedGoals.includes(goal)) {
      showFeedback("error", "That goal is already on your list.");
      return;
    }
    if (selectedGoals.length >= MAX_GOALS) {
      showFeedback("error", `You can pick up to ${MAX_GOALS} goals at a time.`);
      return;
    }
    setSelectedGoals([...selectedGoals, goal]);
    setCustomGoal("");
  };

  const handleSaveGoals = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        wellnessGoals: selectedGoals,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Goals saved.");
    } catch (err) {
      showFeedback("error", friendlyError(err, "Could not save your goals."));
    } finally {
      setSaving(false);
    }
  };

  const userInitials = (name || currentUser?.displayName || currentUser?.email || "U").slice(0, 2).toUpperCase();
  // Custom goals the student added sit after the presets so they stay visible and removable
  const goalOptions = [...PRESET_GOALS, ...selectedGoals.filter((g) => !PRESET_GOALS.includes(g))];

  const allTabs: Array<{ id: TabId; label: string; icon: LucideIcon; show: boolean }> = [
    { id: "profile", label: "Profile", icon: User, show: true },
    { id: "password", label: "Password", icon: Lock, show: true },
    { id: "privacy", label: "Privacy", icon: Shield, show: true },
    { id: "emergency", label: "Emergency contact", icon: HeartPulse, show: isStudent },
    { id: "goals", label: "Goals", icon: Target, show: isStudent },
    { id: "sessions", label: "Session history", icon: ClipboardList, show: isStudent },
  ];
  const navTabs = allTabs.filter((t) => t.show);

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-[color:var(--mb-line)] pb-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-btn mb-btn-line !px-4 text-sm">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          Back
        </button>
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--mb-ink)] sm:text-4xl">Settings</h1>
          <p className="max-w-[65ch] text-[color:var(--mb-muted)]">Your profile, security and what others can see.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center gap-3 rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] p-8 text-[color:var(--mb-muted)]">
          <Spinner size={20} className="text-[color:var(--mb-brand)]" />
          <span>Loading your settings…</span>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-[15rem_1fr]">
          {/* Section list: a column on desktop, a scrolling row on phones */}
          <nav
            aria-label="Settings sections"
            className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
          >
            {navTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setActiveTab(id);
                }}
                aria-current={activeTab === id ? "page" : undefined}
                className="mb-chip"
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 mb-card">
            {/* PROFILE */}
            {activeTab === "profile" && (
              <form onSubmit={handleSaveProfile} noValidate className="space-y-6">
                <PanelHead title="Profile">How your name and picture appear in Mind Bridge.</PanelHead>

                <fieldset className="mb-tile">
                  <legend className="px-1 font-bold text-[color:var(--mb-ink)]">Picture</legend>
                  <div className="flex flex-wrap items-center gap-6">
                    <div
                      style={
                        useGoogleAvatar && currentUser?.photoURL
                          ? undefined
                          : { backgroundColor: avatarColor(avatarId) }
                      }
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[color:var(--mb-ink)]"
                    >
                      {useGoogleAvatar && currentUser?.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt="Your profile picture"
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="font-display text-2xl font-bold text-white">{userInitials}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a picture">
                      {currentUser?.photoURL && (
                        <button
                          type="button"
                          onClick={() => setUseGoogleAvatar(true)}
                          aria-pressed={useGoogleAvatar}
                          aria-label="Use my Google profile picture"
                          className={`relative h-11 w-11 overflow-hidden rounded-full border-2 ${
                            useGoogleAvatar ? "border-[color:var(--mb-ink)]" : "border-[color:var(--mb-line)]"
                          }`}
                        >
                          <img
                            src={currentUser.photoURL}
                            alt=""
                            className="h-full w-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {useGoogleAvatar && (
                            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                              <Check className="h-5 w-5" aria-hidden="true" />
                            </span>
                          )}
                        </button>
                      )}
                      {AVATAR_COLORS.map((c) => {
                        const selected = !useGoogleAvatar && avatarId === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setAvatarId(c.id);
                              setUseGoogleAvatar(false);
                            }}
                            aria-pressed={selected}
                            aria-label={`${c.name} background`}
                            style={{ backgroundColor: c.color }}
                            className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-white ${
                              selected ? "border-[color:var(--mb-ink)]" : "border-[color:var(--mb-line)]"
                            }`}
                          >
                            {selected && <Check className="h-5 w-5" aria-hidden="true" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </fieldset>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="set-name" label="Full name" required error={fieldErrors.name}>
                    <input
                      id="set-name"
                      type="text"
                      value={name}
                      maxLength={80}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      className="mb-field"
                    />
                  </Field>
                  <Field id="set-email" label="Email" hint="school account, cannot be changed">
                    <input
                      id="set-email"
                      type="email"
                      value={currentUser?.email || ""}
                      readOnly
                      className="mb-field !bg-[color:var(--mb-surface-2)] text-[color:var(--mb-muted)]"
                    />
                  </Field>
                  <Field id="set-phone" label="Phone number" hint="optional" error={fieldErrors.phone}>
                    <input
                      id="set-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+63 912 345 6789"
                      autoComplete="tel"
                      className="mb-field"
                    />
                  </Field>
                  <div>
                    <p className="mb-1 font-bold text-[color:var(--mb-ink)]">Account type</p>
                    <p className="flex min-h-[48px] items-center rounded-md border border-[color:var(--mb-line)] bg-[color:var(--mb-surface-2)] px-4 font-bold capitalize text-[color:var(--mb-ink)]">
                      {userRole || "student"}
                    </p>
                  </div>
                </div>

                <Field id="set-bio" label="About you" hint="optional, shown to your counselors">
                  <textarea
                    id="set-bio"
                    rows={3}
                    value={bio}
                    maxLength={500}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Your program, year level, or anything you'd like counselors to know"
                    className="mb-field"
                  />
                </Field>

                <SaveButton saving={saving} type="submit">
                  Save profile
                </SaveButton>
              </form>
            )}

            {/* PASSWORD */}
            {activeTab === "password" && (
              <div className="space-y-6">
                <PanelHead title="Password">Use a password you don't use anywhere else.</PanelHead>

                {isGoogleUser ? (
                  <div className="flex gap-4 rounded-md border border-[color:var(--mb-brand)] bg-[color:var(--mb-brand-bg)] p-6">
                    <KeyRound className="mt-1 h-6 w-6 shrink-0 text-[color:var(--mb-brand)]" aria-hidden="true" />
                    <div>
                      <h3 className="text-xl font-bold text-[color:var(--mb-ink)]">You sign in with Google</h3>
                      <p className="mt-1 max-w-[60ch] text-[color:var(--mb-ink)]">
                        This account is linked to <strong className="break-all">{currentUser?.email}</strong>. Change
                        your password and set up two-step verification in your Google account settings.
                      </p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} noValidate className="max-w-md space-y-4">
                    <Field id="set-current-pw" label="Current password" required error={fieldErrors.currentPassword}>
                      <input
                        id="set-current-pw"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="mb-field"
                      />
                    </Field>
                    <Field
                      id="set-new-pw"
                      label="New password"
                      hint="at least 6 characters"
                      required
                      error={fieldErrors.newPassword}
                    >
                      <input
                        id="set-new-pw"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="mb-field"
                      />
                    </Field>
                    <Field
                      id="set-confirm-pw"
                      label="Confirm new password"
                      required
                      error={fieldErrors.confirmPassword}
                    >
                      <input
                        id="set-confirm-pw"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        className="mb-field"
                      />
                    </Field>
                    <SaveButton saving={passwordLoading} savingLabel="Updating…" type="submit">
                      Update password
                    </SaveButton>
                  </form>
                )}
              </div>
            )}

            {/* PRIVACY: a statement of what is true, not switches */}
            {activeTab === "privacy" && (
              <div className="space-y-6">
                <PanelHead title="Who can see your information">
                  What Mind Bridge shares, and with whom. There are no hidden settings behind this page.
                </PanelHead>

                {isStudent ? (
                  <ul className="space-y-3">
                    {[
                      [
                        "Check-in answers and scores",
                        "You and approved guidance staff (counselors and admins). Other students never see them.",
                      ],
                      ["Appointments and chat messages", "You and approved guidance staff."],
                      ["Your emergency contact", "Approved guidance staff, when they open one of your cases."],
                      [
                        "Reports",
                        "Staff can export a report with names and emails removed. It lists risk level and score only.",
                      ],
                    ].map(([title, body]) => (
                      <li key={title} className="mb-tile">
                        <p className="font-bold text-[color:var(--mb-ink)]">{title}</p>
                        <p className="text-[color:var(--mb-muted)]">{body}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="space-y-3">
                    <li className="mb-tile">
                      <p className="font-bold text-[color:var(--mb-ink)]">Your profile</p>
                      <p className="text-[color:var(--mb-muted)]">
                        Your name, email and role are visible to other approved staff and to students you are assigned
                        to.
                      </p>
                    </li>
                  </ul>
                )}

                <div className="rounded-md border border-[color:var(--mb-warn)] bg-[color:var(--mb-warn-bg)] p-4 text-[color:var(--mb-warn)]">
                  <p className="flex items-center gap-2 font-bold">
                    <Shield className="h-5 w-5" aria-hidden="true" /> Confidentiality notice
                  </p>
                  <p className="mt-1">
                    In line with the Philippine Mental Health Act (RA 11036) and university ethics policy, what you
                    share stays between you and the Guidance Office, except where there is a clear, imminent threat to
                    life or safety.
                  </p>
                </div>

                <p className="text-[color:var(--mb-muted)]">
                  Read the full{" "}
                  <Link to="/privacy-policy" className="font-bold text-[color:var(--mb-ink)] underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            )}

            {/* EMERGENCY CONTACT (students) */}
            {activeTab === "emergency" && (
              <form onSubmit={handleSaveEmergencyContact} noValidate className="space-y-6">
                <PanelHead title="Emergency contact">
                  Someone you trust, such as a parent, guardian or close friend. Approved staff can reach them only in
                  an emergency.
                </PanelHead>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="ec-name" label="Contact's full name" required error={fieldErrors.name}>
                    <input
                      id="ec-name"
                      type="text"
                      value={emergencyContact.name}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, name: e.target.value })}
                      placeholder="e.g. Maria Santos"
                      required
                      className="mb-field"
                    />
                  </Field>
                  <Field id="ec-rel" label="Relationship">
                    <select
                      id="ec-rel"
                      value={emergencyContact.relationship}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, relationship: e.target.value })}
                      className="mb-field"
                    >
                      <option value="Parent">Parent</option>
                      <option value="Guardian">Legal guardian</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Partner">Spouse or partner</option>
                      <option value="Close Friend">Close friend or peer</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>
                  <Field id="ec-phone" label="Mobile number" required error={fieldErrors.phone}>
                    <input
                      id="ec-phone"
                      type="tel"
                      value={emergencyContact.phone}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, phone: e.target.value })}
                      placeholder="+63 912 345 6789"
                      required
                      className="mb-field"
                    />
                  </Field>
                  <Field id="ec-alt" label="Another number" hint="optional" error={fieldErrors.alternatePhone}>
                    <input
                      id="ec-alt"
                      type="tel"
                      value={emergencyContact.alternatePhone}
                      onChange={(e) => setEmergencyContact({ ...emergencyContact, alternatePhone: e.target.value })}
                      className="mb-field"
                    />
                  </Field>
                </div>

                <Field id="ec-notes" label="Anything responders should know" hint="optional">
                  <textarea
                    id="ec-notes"
                    rows={2}
                    value={emergencyContact.notes}
                    onChange={(e) => setEmergencyContact({ ...emergencyContact, notes: e.target.value })}
                    placeholder="e.g. Speaks Hiligaynon, lives nearby, has asthma"
                    className="mb-field"
                  />
                </Field>

                <SaveButton saving={saving} type="submit">
                  Save emergency contact
                </SaveButton>
              </form>
            )}

            {/* GOALS (students) */}
            {activeTab === "goals" && (
              <div className="space-y-6">
                <PanelHead title="Wellness goals">
                  Pick up to {MAX_GOALS} things you want to work on. Only you see this list.
                </PanelHead>

                <p className="font-bold text-[color:var(--mb-ink)]" aria-live="polite">
                  <span className="font-display text-2xl tabular-nums">{selectedGoals.length}</span> of {MAX_GOALS}{" "}
                  chosen
                </p>

                <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Wellness goals">
                  {goalOptions.map((goal) => {
                    const selected = selectedGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => handleToggleGoal(goal)}
                        aria-pressed={selected}
                        className={`flex min-h-[56px] items-center justify-between gap-3 rounded-md border p-3 text-left font-medium transition-colors ${
                          selected
                            ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-brand-bg)] text-[color:var(--mb-ink)]"
                            : "border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] text-[color:var(--mb-ink)] hover:border-[color:var(--mb-muted)]"
                        }`}
                      >
                        <span>{goal}</span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                            selected
                              ? "border-[color:var(--mb-panel)] bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)]"
                              : "border-[color:var(--mb-line)]"
                          }`}
                          aria-hidden="true"
                        >
                          {selected && <Check className="h-4 w-4" />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleAddCustomGoal} className="flex gap-2">
                  <label htmlFor="custom-goal" className="sr-only">
                    Add your own goal
                  </label>
                  <input
                    id="custom-goal"
                    type="text"
                    value={customGoal}
                    onChange={(e) => setCustomGoal(e.target.value)}
                    placeholder="Add your own goal"
                    className="mb-field flex-1"
                  />
                  <button type="submit" className="mb-btn mb-btn-line !px-4">
                    <Plus className="h-5 w-5" aria-hidden="true" />
                    Add
                  </button>
                </form>

                <SaveButton saving={saving} savingLabel="Saving…" type="button" onClick={handleSaveGoals}>
                  Save goals
                </SaveButton>
              </div>
            )}

            {/* SESSION HISTORY (students) */}
            {activeTab === "sessions" && (
              <div className="space-y-6">
                <PanelHead title="Session history">Your appointments with guidance counselors.</PanelHead>

                {loadingApts ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-[color:var(--mb-muted)]">
                    <Spinner size={18} className="text-[color:var(--mb-brand)]" />
                    <span>Loading your sessions…</span>
                  </div>
                ) : appointmentsList.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[color:var(--mb-line)] p-8 text-center">
                    <div className="mb-plate mx-auto mb-3 flex h-12 w-12 items-center justify-center">
                      <Calendar className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-[color:var(--mb-ink)]">No sessions yet</h3>
                    <p className="mx-auto mt-1 max-w-[45ch] text-[color:var(--mb-muted)]">
                      You haven't booked a session. You can book a confidential time whenever you're ready.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/appointments")}
                      className="mb-btn mb-btn-solid mt-4"
                    >
                      Book a counselor
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {appointmentsList.map((apt) => (
                      <li
                        key={apt.id}
                        className="flex flex-col gap-2 mb-tile sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-display text-xl font-bold text-[color:var(--mb-ink)]">
                            {apt.title || "Counseling session"}
                          </p>
                          <p className="text-[color:var(--mb-muted)]">
                            {apt.counselorName || "Assigned counselor"} · {formatDateTime(apt.start || apt.date)}
                          </p>
                        </div>
                        <span
                          className={`self-start rounded border px-2 py-1 text-xs font-bold uppercase tracking-wider ${statusTone(apt.status)}`}
                        >
                          {apt.status || "Pending Review"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
