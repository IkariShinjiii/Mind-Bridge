import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { auth, db } from "../firebase";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { getUserSettings, saveUserSettings, getAppointments } from "../api";
import Spinner from "./Spinner";

const AVATAR_GRADIENTS = [
  { id: "cyan", name: "Cyan Breeze", class: "from-cyan-500 to-blue-600" },
  { id: "purple", name: "Purple Twilight", class: "from-purple-500 to-indigo-600" },
  { id: "emerald", name: "Emerald Forest", class: "from-emerald-500 to-teal-600" },
  { id: "amber", name: "Amber Glow", class: "from-amber-500 to-orange-600" },
  { id: "rose", name: "Rose Petal", class: "from-rose-500 to-pink-600" },
];

const PRESET_GOALS = [
  "Manage Academic Stress & Burnout",
  "Improve Sleep Quality & Hygiene",
  "Build Daily Mindfulness & Focus",
  "Overcome Social Anxiety & Isolation",
  "Establish Healthy Work-Life Balance",
  "Boost Self-Esteem & Confidence",
  "Develop Healthy Emotional Coping Mechanisms",
  "Improve Interpersonal Communication",
];

function safeFormatDate(val) {
  if (!val) return "Not specified";
  if (typeof val === "string" && !val.includes("-") && !val.includes("/")) return val;
  const date = new Date(val);
  return Number.isNaN(date.getTime()) ? val : date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function UserSettings() {
  const { currentUser, userRole, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [avatarGradient, setAvatarGradient] = useState("cyan");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Notification prefs
  const [notifications, setNotifications] = useState({
    appointmentReminders: true,
    wellnessNudges: true,
    counselorMessages: true,
    emergencyAlerts: true,
  });

  // Privacy prefs
  const [privacy, setPrivacy] = useState({
    allowCounselorHistory: true,
    includeInAnonymizedReports: true,
    allowEmergencyNotification: true,
  });

  // Emergency Contact
  const [emergencyContact, setEmergencyContact] = useState({
    name: "",
    relationship: "Parent",
    phone: "",
    alternatePhone: "",
    notes: "",
  });

  // Wellness Goals
  const [selectedGoals, setSelectedGoals] = useState([]);
  const [customGoal, setCustomGoal] = useState("");

  // Appointments
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [loadingApts, setLoadingApts] = useState(false);

  // Is Google OAuth User?
  const isGoogleUser = currentUser?.providerData?.some(
    (p) => p.providerId === "google.com"
  );

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
          setAvatarGradient(data.avatarGradient || "cyan");
          if (data.notifications) setNotifications((prev) => ({ ...prev, ...data.notifications }));
          if (data.privacy) setPrivacy((prev) => ({ ...prev, ...data.privacy }));
          if (data.emergencyContact) setEmergencyContact((prev) => ({ ...prev, ...data.emergencyContact }));
          if (Array.isArray(data.wellnessGoals)) setSelectedGoals(data.wellnessGoals);
        } else {
          setName(currentUser.displayName || "");
        }
      } catch (err) {
        console.error("Error loading user settings:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Load session history when tab is opened
  useEffect(() => {
    if (activeTab === "sessions" && currentUser) {
      let isMounted = true;
      setLoadingApts(true);
      getAppointments()
        .then((data) => {
          if (isMounted) setAppointmentsList(Array.isArray(data) ? data : []);
        })
        .catch((err) => console.error("Error fetching sessions:", err))
        .finally(() => {
          if (isMounted) setLoadingApts(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [activeTab, currentUser]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback({ type: "", message: "" });
    }, 4000);
  };

  // 1. Save Profile Info
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showFeedback("error", "Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      if (currentUser && currentUser.displayName !== name) {
        await updateProfile(currentUser, { displayName: name });
      }
      await saveUserSettings(currentUser.uid, {
        name,
        phone,
        bio,
        avatarGradient,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Profile information updated successfully!");
    } catch (err) {
      console.error(err);
      showFeedback("error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // 2. Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showFeedback("error", "Please fill in all password fields.");
      return;
    }
    if (newPassword.length < 6) {
      showFeedback("error", "New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback("error", "New passwords do not match.");
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
      showFeedback("success", "Password updated successfully!");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        showFeedback("error", "Current password is incorrect.");
      } else {
        showFeedback("error", err.message || "Failed to update password.");
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  // 3. Save Notification Preferences
  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        notifications,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Notification preferences saved!");
    } catch (err) {
      showFeedback("error", err.message || "Failed to save notifications.");
    } finally {
      setSaving(false);
    }
  };

  // 4. Save Privacy Preferences
  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        privacy,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Privacy settings updated!");
    } catch (err) {
      showFeedback("error", err.message || "Failed to update privacy settings.");
    } finally {
      setSaving(false);
    }
  };

  // 5. Save Emergency Contact
  const handleSaveEmergencyContact = async (e) => {
    e.preventDefault();
    if (!emergencyContact.name.trim() || !emergencyContact.phone.trim()) {
      showFeedback("error", "Please provide at least a contact name and primary phone number.");
      return;
    }
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        emergencyContact,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Emergency contact details saved securely.");
    } catch (err) {
      showFeedback("error", err.message || "Failed to save emergency contact.");
    } finally {
      setSaving(false);
    }
  };

  // 6. Save Wellness Goals
  const handleToggleGoal = (goal) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter((g) => g !== goal));
    } else {
      if (selectedGoals.length >= 5) {
        showFeedback("error", "You can choose up to 5 focus goals at a time.");
        return;
      }
      setSelectedGoals([...selectedGoals, goal]);
    }
  };

  const handleAddCustomGoal = (e) => {
    e.preventDefault();
    if (!customGoal.trim()) return;
    if (selectedGoals.includes(customGoal.trim())) {
      showFeedback("error", "Goal already added.");
      return;
    }
    if (selectedGoals.length >= 5) {
      showFeedback("error", "You can choose up to 5 focus goals at a time.");
      return;
    }
    setSelectedGoals([...selectedGoals, customGoal.trim()]);
    setCustomGoal("");
  };

  const handleSaveGoals = async () => {
    setSaving(true);
    try {
      await saveUserSettings(currentUser.uid, {
        wellnessGoals: selectedGoals,
        updatedAt: new Date().toISOString(),
      });
      await refreshUserData();
      showFeedback("success", "Wellness goals updated!");
    } catch (err) {
      showFeedback("error", err.message || "Failed to save goals.");
    } finally {
      setSaving(false);
    }
  };

  const currentGradientClass =
    AVATAR_GRADIENTS.find((g) => g.id === avatarGradient)?.class || "from-cyan-500 to-blue-600";
  const userInitials = (name || currentUser?.displayName || currentUser?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  const isStudent = (userRole || "student") === "student";

  const navTabs = [
    { id: "profile", label: "Profile Info", icon: "👤", show: true },
    { id: "password", label: "Security & Password", icon: "🔒", show: true },
    { id: "notifications", label: "Notifications", icon: "🔔", show: true },
    { id: "privacy", label: "Privacy & Data", icon: "🛡️", show: true },
    { id: "emergency", label: "Emergency Contact", icon: "🆘", show: isStudent },
    { id: "goals", label: "Wellness Goals", icon: "🎯", show: isStudent },
    { id: "sessions", label: "Session History", icon: "📋", show: isStudent },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto max-w-6xl animate-fade-up">
      {/* Header Bar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-white transition-colors"
            title="Go Back"
          >
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Account & Profile Settings
            </h1>
            <p className="text-sm text-cyan-200/80">
              Manage your personal information, privacy preferences, and wellness settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${currentGradientClass} text-sm font-bold text-white shadow-md`}>
            {userInitials}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{name || "User"}</div>
            <div className="text-xs uppercase tracking-wider text-cyan-400 font-medium">
              {userRole || "student"}
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          className={`mb-6 rounded-xl border p-4 text-sm font-medium transition-all ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? "✓ " : "⚠️ "} {feedback.message}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-gray-800 bg-gray-900/60 p-12 text-gray-400">
          <div className="flex items-center gap-3">
            <Spinner size={22} className="text-cyan-400" />
            <span>Loading your settings...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Sidebar Tabs (Desktop) / Scrollable Pills (Mobile) */}
          <div className="md:col-span-1">
            <div className="flex flex-row overflow-x-auto gap-2 rounded-2xl border border-gray-800 bg-gray-900/80 p-2 md:flex-col md:overflow-visible">
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-all ${
                      isActive
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-900/20"
                        : "text-gray-400 hover:bg-gray-800/80 hover:text-gray-200"
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Panel */}
          <div className="md:col-span-3">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/90 p-6 sm:p-8 shadow-xl">
              {/* TAB 1: PROFILE INFO */}
              {activeTab === "profile" && (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Profile Information</h2>
                    <p className="text-sm text-gray-400">
                      Update your account details and choose how you appear in Mind Bridge.
                    </p>
                  </div>

                  {/* Avatar & Color Picker */}
                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Profile Avatar & Color Accent
                    </label>
                    <div className="flex flex-wrap items-center gap-4">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${currentGradientClass} text-xl font-bold text-white shadow-lg transition-transform hover:scale-105`}
                      >
                        {userInitials}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {AVATAR_GRADIENTS.map((g) => (
                          <button
                            type="button"
                            key={g.id}
                            onClick={() => setAvatarGradient(g.id)}
                            className={`h-8 w-8 rounded-full bg-gradient-to-br ${g.class} transition-all ${
                              avatarGradient === g.id
                                ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-110"
                                : "opacity-70 hover:opacity-100"
                            }`}
                            title={g.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        required
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Email Address <span className="text-xs text-gray-500">(Institutional)</span>
                      </label>
                      <input
                        type="email"
                        value={currentUser?.email || ""}
                        disabled
                        className="w-full rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-2.5 text-gray-400 cursor-not-allowed text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+63 912 345 6789"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Account Role
                      </label>
                      <div className="flex h-[42px] items-center rounded-xl border border-gray-800 bg-gray-950/60 px-4 text-sm text-cyan-300 font-semibold uppercase tracking-wider">
                        {userRole || "student"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      About / Bio <span className="text-xs text-gray-500">(Optional note for counselors)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share brief context about your degree program, current year level, or anything you'd like your counselors to know..."
                      className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {saving && <Spinner size={16} />}
                      {saving ? "Saving Changes..." : "Save Profile"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SECURITY & PASSWORD */}
              {activeTab === "password" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Security & Password</h2>
                    <p className="text-sm text-gray-400">
                      Keep your Mind Bridge account safe with a strong, distinct password.
                    </p>
                  </div>

                  {isGoogleUser ? (
                    <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-6 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20 text-xl text-cyan-300">
                        🔐
                      </div>
                      <h3 className="text-base font-semibold text-white">
                        Google Authenticated Account
                      </h3>
                      <p className="mt-1 text-sm text-gray-300 max-w-md mx-auto">
                        Your account is linked with your Google login (<strong>{currentUser?.email}</strong>).
                        Password changes and 2-Factor Authentication are managed directly in your Google Security settings.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-300">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          required
                          className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                        >
                          {passwordLoading && <Spinner size={16} />}
                          {passwordLoading ? "Updating Password..." : "Update Password"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 3: NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Notification Preferences</h2>
                    <p className="text-sm text-gray-400">
                      Choose which updates, reminders, and alerts you wish to receive.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Appointment Reminders
                        </div>
                        <div className="text-xs text-gray-400">
                          Receive notifications 24 hours and 1 hour before scheduled counseling sessions.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.appointmentReminders}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            appointmentReminders: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Weekly Wellness Check-in Nudge
                        </div>
                        <div className="text-xs text-gray-400">
                          Gentle reminders to take your 2-minute weekly wellness check-in survey.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.wellnessNudges}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            wellnessNudges: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Counselor Updates & Notes
                        </div>
                        <div className="text-xs text-gray-400">
                          Notifications when your assigned counselor reviews your survey or posts notes.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.counselorMessages}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            counselorMessages: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Urgent Support & Crisis Hotlines Alert
                        </div>
                        <div className="text-xs text-gray-400">
                          Direct resources and hotline prompts during elevated distress signals.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emergencyAlerts}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            emergencyAlerts: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {saving && <Spinner size={16} />}
                      {saving ? "Saving..." : "Save Preferences"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PRIVACY & CONFIDENTIALITY */}
              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Privacy & Confidentiality</h2>
                    <p className="text-sm text-gray-400">
                      Your mental health data is protected under strict confidentiality protocols.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Counselor Check-in Access
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Allow registered University Counselors to review your check-in trends to personalize guidance and offer proactive appointments.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.allowCounselorHistory}
                        onChange={(e) =>
                          setPrivacy({
                            ...privacy,
                            allowCounselorHistory: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500 mt-1"
                      />
                    </div>

                    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
                      <div>
                        <div className="font-medium text-white text-sm">
                          Anonymized Institutional Research
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Permit stripped, fully anonymized aggregate statistics to help the university improve overall student mental health programs.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={privacy.includeInAnonymizedReports}
                        onChange={(e) =>
                          setPrivacy({
                            ...privacy,
                            includeInAnonymizedReports: e.target.checked,
                          })
                        }
                        className="h-5 w-5 rounded border-gray-700 bg-gray-800 text-cyan-600 focus:ring-cyan-500 mt-1"
                      />
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
                        <span>ℹ️</span>
                        <span>Confidentiality Notice</span>
                      </div>
                      <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                        In accordance with the Philippine Mental Health Act (RA 11036) and institutional ethics policies, student disclosures remain strictly confidential between you and the University Guidance Office, except in clear, imminent threats to life or safety.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSavePrivacy}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {saving && <Spinner size={16} />}
                      {saving ? "Saving..." : "Save Privacy Settings"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: EMERGENCY CONTACT (Student Only) */}
              {activeTab === "emergency" && (
                <form onSubmit={handleSaveEmergencyContact} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Emergency Contact</h2>
                    <p className="text-sm text-gray-400">
                      Designate a trusted individual (parent, guardian, close friend) to be reached in extreme emergencies.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Contact Full Name
                      </label>
                      <input
                        type="text"
                        value={emergencyContact.name}
                        onChange={(e) =>
                          setEmergencyContact({ ...emergencyContact, name: e.target.value })
                        }
                        placeholder="e.g. Maria Santos"
                        required
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Relationship
                      </label>
                      <select
                        value={emergencyContact.relationship}
                        onChange={(e) =>
                          setEmergencyContact({
                            ...emergencyContact,
                            relationship: e.target.value,
                          })
                        }
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      >
                        <option value="Parent">Parent</option>
                        <option value="Guardian">Legal Guardian</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Partner">Spouse / Partner</option>
                        <option value="Close Friend">Close Friend / Peer</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Primary Mobile / Phone
                      </label>
                      <input
                        type="tel"
                        value={emergencyContact.phone}
                        onChange={(e) =>
                          setEmergencyContact({ ...emergencyContact, phone: e.target.value })
                        }
                        placeholder="+63 912 345 6789"
                        required
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-300">
                        Alternate Contact / Landline <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        value={emergencyContact.alternatePhone}
                        onChange={(e) =>
                          setEmergencyContact({
                            ...emergencyContact,
                            alternatePhone: e.target.value,
                          })
                        }
                        placeholder="+63 (033) 337-xxxx"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      Special Medical / Response Notes <span className="text-xs text-gray-500">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={emergencyContact.notes}
                      onChange={(e) =>
                        setEmergencyContact({ ...emergencyContact, notes: e.target.value })
                      }
                      placeholder="e.g. Speaks Hiligaynon, lives nearby on campus dorm, has asthma inhaler..."
                      className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {saving && <Spinner size={16} />}
                      {saving ? "Saving..." : "Save Emergency Contact"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 6: WELLNESS GOALS (Student Only) */}
              {activeTab === "goals" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold text-white">Personal Wellness Goals</h2>
                      <p className="text-sm text-gray-400">
                        Pick up to 5 focus areas to track your emotional and personal growth.
                      </p>
                    </div>
                    <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 self-start">
                      {selectedGoals.length} / 5 Selected
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {PRESET_GOALS.map((goal) => {
                      const isSelected = selectedGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => handleToggleGoal(goal)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm transition-all ${
                            isSelected
                              ? "border-cyan-500 bg-cyan-950/40 text-cyan-200 shadow-sm"
                              : "border-gray-800 bg-gray-950/40 text-gray-300 hover:border-gray-700 hover:text-white"
                          }`}
                        >
                          <span className="font-medium pr-2">{goal}</span>
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                              isSelected
                                ? "bg-cyan-500 text-gray-950"
                                : "border border-gray-700 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Add Custom Goal */}
                  <form onSubmit={handleAddCustomGoal} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="Add custom wellness goal..."
                      className="flex-1 rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2 text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
                    >
                      + Add
                    </button>
                  </form>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleSaveGoals}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-cyan-500 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                    >
                      {saving && <Spinner size={16} />}
                      {saving ? "Saving Goals..." : "Save Focus Goals"}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 7: SESSION HISTORY & NOTES (Student Only) */}
              {activeTab === "sessions" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Counseling Session Records</h2>
                    <p className="text-sm text-gray-400">
                      View your appointment history and guidance logs with school counselors.
                    </p>
                  </div>

                  {loadingApts ? (
                    <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                      <Spinner size={18} className="text-cyan-400" />
                      <span>Loading your session records...</span>
                    </div>
                  ) : appointmentsList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-800 p-8 text-center text-gray-400">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800/60 text-xl">
                        📅
                      </div>
                      <h3 className="text-base font-medium text-white">No Sessions Found</h3>
                      <p className="mt-1 text-sm text-gray-400 max-w-sm mx-auto">
                        You haven't booked any counseling sessions yet. You can book a confidential slot from your dashboard anytime.
                      </p>
                      <button
                        onClick={() => navigate("/student/dashboard")}
                        className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
                      >
                        Go to Dashboard to Book
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {appointmentsList.map((apt) => {
                        const status = apt.status || "Pending Review";
                        const isConfirmed = status.toLowerCase().includes("confirm");
                        const isPending = status.toLowerCase().includes("pending");

                        return (
                          <div
                            key={apt.id}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-4 transition-all hover:border-gray-700"
                          >
                            <div>
                              <div className="font-semibold text-white text-base">
                                {apt.title || "Counseling Session"}
                              </div>
                              <div className="mt-1 text-xs text-gray-400">
                                Counselor:{" "}
                                <span className="text-gray-300 font-medium">
                                  {apt.counselorName || "Assigned Counselor"}
                                </span>
                              </div>
                              <div className="mt-0.5 text-xs text-gray-400">
                                Date & Time:{" "}
                                <span className="text-cyan-300 font-medium">
                                  {safeFormatDate(apt.start || apt.date)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                                  isConfirmed
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : isPending
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-gray-800 text-gray-300 border border-gray-700"
                                }`}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
