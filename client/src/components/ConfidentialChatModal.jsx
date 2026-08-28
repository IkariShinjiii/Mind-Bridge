import React, { useState, useEffect, useRef } from "react";
import { listenToStudentMessages, sendStudentMessage } from "../api";
import { useAuth } from "../AuthContext.jsx";

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
  // studentId: the student's UID — the shared key for the thread
  studentId,
  // Display info for the other party
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
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const grouped = groupByDay(messages);
  const isCounselorView = userRole === "counselor";

  const quickRepliesStudent = [
    "Thank you for reviewing my wellness check-in.",
    "Can we reschedule our upcoming counseling session?",
    "I have a concern I'd like to discuss privately.",
    "I'm feeling better, thank you!",
  ];

  const quickRepliesCounselor = [
    "I've reviewed your check-in. How are classes going?",
    "Please feel free to drop by the Guidance Office anytime.",
    "I've scheduled a follow-up — please book a slot.",
    "You're doing great — keep checking in!",
  ];

  const quickReplies = isCounselorView ? quickRepliesCounselor : quickRepliesStudent;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex flex-col w-full max-w-lg h-[90vh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl border border-gray-700/80 bg-gray-900 shadow-2xl overflow-hidden animate-fade-up">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 bg-gray-950 px-4 py-3.5 border-b border-gray-800/80 shrink-0">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
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
            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
              <svg className="h-2.5 w-2.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a5 5 0 1 0 0 10A5 5 0 0 0 8 1zm0 9a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>
                <path d="M7.002 11h2v2h-2zM7.1 5.995a1 1 0 0 1 1.8 0A2 2 0 0 1 9.6 8c-.5.5-.6.6-.6 1H7c0-.8.3-1.2 1-2a1 1 0 0 0 .1-.005z"/>
              </svg>
              End-to-end confidential channel
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white transition"
            aria-label="Close chat"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
            </svg>
          </button>
        </div>

        {/* ── Message Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gradient-to-b from-gray-950/60 to-gray-900/80 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700">
          {loading ? (
            <div className="flex flex-col h-full items-center justify-center gap-3 text-gray-500">
              <div className="h-8 w-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <span className="text-xs">Loading secure messages…</span>
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-6">
              <div className="text-2xl">⚠️</div>
              <p className="text-sm font-medium text-red-300">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center gap-3 px-6">
              <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-2xl shadow-inner border border-cyan-500/20">
                🔒
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Confidential Thread</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-xs">
                  {isCounselorView
                    ? "Send a private message to this student. Only you and the student can see this conversation."
                    : "Send a secure message to your guidance counselor. This conversation is completely private."}
                </p>
              </div>
            </div>
          ) : (
            grouped.map(({ day, messages: dayMsgs }) => (
              <div key={day}>
                {/* Day label */}
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[10px] text-gray-500 font-medium px-1">
                    {formatDayLabel(dayMsgs[0]?.timestamp)}
                  </span>
                  <div className="flex-1 h-px bg-gray-800" />
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
                      {/* Avatar for other person (only on last bubble of group) */}
                      {!isMe && (
                        <div className={`w-6 mr-1.5 flex items-end ${isLast ? "opacity-100" : "opacity-0"}`}>
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                            {(msg.senderName || "?").slice(0, 1).toUpperCase()}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col max-w-[75%]">
                        {/* Sender name (only on first in group, not for "me") */}
                        {!isMe && isFirst && (
                          <span className="text-[10px] text-gray-500 ml-1 mb-1 font-medium">
                            {msg.senderName || "Counselor"}
                          </span>
                        )}

                        <div
                          className={`px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
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
                              : `bg-gray-800 border border-gray-700/60 text-gray-100 ${
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

                        {/* Timestamp on last bubble of group */}
                        {isLast && (
                          <span className={`text-[10px] text-gray-600 mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
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
          <div className="px-3 py-2 border-t border-gray-800/60 bg-gray-900/80 overflow-x-auto scrollbar-none flex gap-1.5 shrink-0">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => {
                  setInputText(reply);
                  inputRef.current?.focus();
                }}
                className="shrink-0 whitespace-nowrap rounded-full border border-gray-700 bg-gray-800/60 px-3 py-1 text-[11px] text-gray-300 hover:border-cyan-500/50 hover:text-white hover:bg-gray-800 transition"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* ── Input Bar ── */}
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2.5 px-3 py-3 bg-gray-950 border-t border-gray-800/80 shrink-0"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Auto-resize
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a confidential message…"
              className="w-full resize-none overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition leading-relaxed min-h-[42px]"
              style={{ height: "42px" }}
            />
          </div>

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="shrink-0 h-10 w-10 rounded-full bg-cyan-600 flex items-center justify-center text-white hover:bg-cyan-500 transition disabled:opacity-40 shadow-lg disabled:shadow-none"
            aria-label="Send message"
          >
            {sending ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg className="h-4 w-4 translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
