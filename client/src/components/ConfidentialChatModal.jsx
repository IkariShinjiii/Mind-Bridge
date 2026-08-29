import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listenToStudentMessages, sendStudentMessage } from "../api";
import { useAuth } from "../AuthContext.jsx";
import { X, Lock, AlertTriangle, Send } from "lucide-react";

function formatTime(val) {
  if (!val) return "";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDayLabel(val) {
  if (!val) return "";
  const date = new Date(val);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Groups messages by calendar day
function groupByDay(messages) {
  const groups = [];
  let currentDay = null;
  let currentGroup = [];

  for (const msg of messages) {
    const day = msg.timestamp ? new Date(msg.timestamp).toDateString() : "Unknown";
    if (day !== currentDay) {
      if (currentGroup.length) groups.push({ day: currentDay, messages: currentGroup });
      currentDay = day;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  }
  if (currentGroup.length) groups.push({ day: currentDay, messages: currentGroup });
  return groups;
}

export default function ConfidentialChatModal({
  isOpen,
  onClose,
  studentId,
  recipientName,
  recipientRole = "counselor",
}) {
  const { currentUser, userRole, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const currentUserId = currentUser?.uid;
  const currentUserName =
    userData?.name || currentUser?.displayName || (userRole === "counselor" ? "Counselor" : "Student");

  // The student IS the thread anchor — works for both sides
  const threadStudentId = studentId || (userRole === "student" ? currentUserId : null);

  useEffect(() => {
    if (!isOpen || !threadStudentId) return;
    setLoading(true);
    setError(null);

    const unsub = listenToStudentMessages(
      threadStudentId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error("Chat error", err);
        setError("Could not load messages. Check Firestore rules.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isOpen, threadStudentId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function handleSend(e) {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || sending || !threadStudentId) return;

    setInputText("");
    setSending(true);
    try {
      await sendStudentMessage({
        studentId: threadStudentId,
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: userRole || "student",
        text,
      });
    } catch (err) {
      console.error("Failed to send message", err);
      setError("Message failed to send. Please try again.");
      setInputText(text); // restore
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const grouped = groupByDay(messages);
  const isCounselorView = userRole === "counselor";

  const quickRepliesStudent = [
    "Thank you for reviewing my check-in.",
    "Can we reschedule our session?",
    "I'd like to discuss a concern privately.",
    "I'm feeling much better, thank you!",
  ];

  const quickRepliesCounselor = [
    "I've reviewed your check-in. How are you feeling today?",
    "Feel free to drop by the Guidance Office anytime.",
    "Please book a follow-up counseling slot.",
    "You're doing great — keep up the daily check-ins!",
  ];

  const quickReplies = isCounselorView ? quickRepliesCounselor : quickRepliesStudent;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Confidential chat"
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0 }}
            className="relative z-10 flex flex-col w-full max-w-lg h-[90dvh] max-h-[640px] rounded-3xl border border-white/[0.08] bg-gray-900 shadow-2xl overflow-hidden"
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 bg-gray-950/70 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-white/[0.08] shrink-0 backdrop-blur-md">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {(recipientName || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-gray-950 shadow-sm" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm truncate">
                    {recipientName || (isCounselorView ? "Student" : "Your Counselor")}
                  </span>
                  <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-cyan-300 border border-cyan-500/20 tracking-wide">
                    {recipientRole}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  Confidential & Private Counseling Channel
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center text-gray-400 hover:bg-white/[0.08] hover:text-white transition interactive-tap"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Message Body ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-gray-950/60 to-gray-900/80 custom-scrollbar">
              {loading ? (
                <div className="flex flex-col h-full items-center justify-center gap-3 text-gray-400">
                  <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                  <span className="text-xs">Loading secure messages…</span>
                </div>
              ) : error ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-6">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="text-sm font-medium text-red-300">{error}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center gap-3 px-6">
                  <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center shadow-inner border border-cyan-500/20">
                    <Lock className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Confidential Counseling Thread</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs">
                      {isCounselorView
                        ? "Send a private message to this student. Only you and the student have access to this conversation."
                        : "Send a secure message to your guidance counselor. This conversation is completely confidential."}
                    </p>
                  </div>
                </div>
              ) : (
                grouped.map(({ day, messages: dayMsgs }) => (
                  <div key={day}>
                    {/* Day label */}
                    <div className="flex items-center gap-2 my-3">
                      <div className="flex-1 h-px bg-white/[0.08]" />
                      <span className="text-[10px] text-gray-400 font-medium px-1">
                        {formatDayLabel(dayMsgs[0]?.timestamp)}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.08]" />
                    </div>

                    {dayMsgs.map((msg, i) => {
                      const isMe = msg.senderId === currentUserId;
                      const isFirst = i === 0 || dayMsgs[i - 1]?.senderId !== msg.senderId;
                      const isLast = i === dayMsgs.length - 1 || dayMsgs[i + 1]?.senderId !== msg.senderId;

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? "justify-end" : "justify-start"} ${isFirst ? "mt-3" : "mt-0.5"}`}
                        >
                          {/* Avatar for other person */}
                          {!isMe && (
                            <div className={`w-6 mr-1.5 flex items-end ${isLast ? "opacity-100" : "opacity-0"}`}>
                              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                                {(msg.senderName || "?").slice(0, 1).toUpperCase()}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-col max-w-[78%]">
                            {!isMe && isFirst && (
                              <span className="text-[10px] text-gray-400 ml-1 mb-1 font-medium">
                                {msg.senderName || "Counselor"}
                              </span>
                            )}

                            <div
                              className={`px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                                isMe
                                  ? `bg-cyan-600 text-white ${
                                      isFirst && isLast
                                        ? "rounded-2xl"
                                        : isFirst
                                        ? "rounded-2xl rounded-br-md"
                                        : isLast
                                        ? "rounded-2xl rounded-tr-md"
                                        : "rounded-lg rounded-r-md"
                                    }`
                                  : `bg-gray-800/90 border border-white/[0.08] text-gray-100 ${
                                      isFirst && isLast
                                        ? "rounded-2xl"
                                        : isFirst
                                        ? "rounded-2xl rounded-bl-md"
                                        : isLast
                                        ? "rounded-2xl rounded-tl-md"
                                        : "rounded-lg rounded-l-md"
                                    }`
                              }`}
                            >
                              {msg.text}
                            </div>

                            {isLast && (
                              <span className={`text-[10px] text-gray-500 mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                                {formatTime(msg.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick Replies ── */}
            {!loading && (
              <div className="px-3 py-2 border-t border-white/[0.08] bg-gray-950/40 overflow-x-auto custom-scrollbar flex gap-2 shrink-0">
                {quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => {
                      setInputText(reply);
                      inputRef.current?.focus();
                    }}
                    className="min-h-[36px] shrink-0 whitespace-nowrap rounded-xl border border-white/10 bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 hover:border-cyan-500/40 hover:text-white hover:bg-gray-800 transition interactive-tap"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input Bar ── */}
            <form
              onSubmit={handleSend}
              className="flex items-end gap-2.5 px-3 py-3 bg-gray-950/80 border-t border-white/[0.08] shrink-0"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a confidential message…"
                  className="w-full resize-none overflow-hidden rounded-2xl border border-white/10 bg-gray-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition leading-relaxed min-h-[44px]"
                  style={{ height: "44px" }}
                />
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="shrink-0 h-11 w-11 rounded-2xl bg-cyan-600 flex items-center justify-center text-white hover:bg-cyan-500 transition disabled:opacity-40 shadow-lg disabled:shadow-none interactive-tap"
                aria-label="Send message"
              >
                {sending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Send className="h-5 w-5 translate-x-0.5" />
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
