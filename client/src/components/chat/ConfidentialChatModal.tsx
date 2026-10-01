import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import { LazyMotion, domAnimation, m, AnimatePresence } from "framer-motion";
import { listenToStudentMessages, sendStudentMessage } from "../../lib/api";
import { useAuth } from "../../hooks/useAuth";
import { X, Lock, AlertTriangle, Send } from "lucide-react";
import Spinner from "../ui/Spinner";
import { validate } from "../../lib/validate";
import { chatMessageSchema } from "../../lib/schemas";
import { friendlyError } from "../../utils/errors";
import type { ChatMessage, StoredDate } from "../../types";
import useFocusTrap from "../../hooks/useFocusTrap";
import { parseDate } from "../../utils/dates";

/**
 * Clock time for a chat bubble, e.g. "9:30 AM".
 * @param {string|number|Date} val
 * @returns {string} empty when the value is not a date
 */
function formatTime(val: StoredDate): string {
  if (!val) return "";
  const date = parseDate(val);
  if (!date) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/**
 * Day heading for a group of messages: "Today", "Yesterday", or a short date.
 * @param {string|number|Date} val
 * @returns {string} empty when the value is not a date
 */
function formatDayLabel(val: StoredDate): string {
  if (!val) return "";
  const date = parseDate(val);
  if (!date) return "";
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
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

/**
 * Groups messages (already in time order) by calendar day.
 * @param {Array<{ timestamp?: string }>} messages
 * @returns {Array<{ day: string, messages: Array<object> }>}
 */
function groupByDay(messages: ChatMessage[]): Array<{ day: string; messages: ChatMessage[] }> {
  const groups: Array<{ day: string; messages: ChatMessage[] }> = [];
  for (const msg of messages) {
    const day = msg.timestamp ? new Date(msg.timestamp).toDateString() : "Unknown";
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.messages.push(msg);
    else groups.push({ day, messages: [msg] });
  }
  return groups;
}

export interface ConfidentialChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Thread owner. Omit when a student opens their own thread. */
  studentId?: string | undefined;
  recipientName?: string | undefined;
  recipientRole?: string;
}

export default function ConfidentialChatModal({
  isOpen,
  onClose,
  studentId,
  recipientName,
  recipientRole = "counselor",
}: ConfidentialChatModalProps) {
  const { currentUser, userRole, userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen, onClose);

  const currentUserId = currentUser?.uid;
  const currentUserName =
    userData?.name || currentUser?.displayName || (userRole === "student" ? "Student" : "Staff Counselor");

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
        setError("Could not load messages. Check your connection and reopen the chat.");
        setLoading(false);
      },
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

  async function handleSend(e?: FormEvent) {
    e?.preventDefault();
    if (sending || !threadStudentId) return;
    const parsed = validate(chatMessageSchema, { studentId: threadStudentId, text: inputText });
    if (!parsed.ok) {
      // An empty message is simply ignored; only a too-long one needs explaining
      if (inputText.trim()) setError(parsed.error.userMessage);
      return;
    }
    const text = parsed.data.text;
    setError(null);

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
      setError(friendlyError(err, "Message failed to send. Please try again."));
      setInputText(text); // restore
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const grouped = groupByDay(messages);
  const isCounselorView = userRole === "admin";

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
    <LazyMotion features={domAnimation} strict>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              aria-hidden="true"
              className="fixed inset-0 bg-black/80"
            />

            {/* Modal Container */}
            <m.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`Confidential chat with ${recipientName || (isCounselorView ? "student" : "your counselor")}`}
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0 }}
              className="relative z-10 flex flex-col w-full max-w-lg h-[90dvh] max-h-[640px] rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] shadow-sm overflow-hidden"
            >
              {/* ── Header ── */}
              <div className="flex items-center gap-3 bg-[color:var(--mb-ground)] px-4 py-3.5 sm:px-5 sm:py-4 border-b-2 border-[color:var(--mb-line)] shrink-0">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full border-2 border-[color:var(--mb-ink)] bg-[color:var(--mb-panel)] flex items-center justify-center text-[color:var(--mb-panel-ink)] font-bold">
                    {(recipientName || "?").slice(0, 1).toUpperCase()}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[color:var(--mb-ink)] truncate">
                      {recipientName || (isCounselorView ? "Student" : "Your Counselor")}
                    </span>
                    <span className="shrink-0 rounded-full bg-[color:var(--mb-brand-bg)] px-2 py-0.5 text-xs font-bold uppercase text-[color:var(--mb-brand)] border-2 border-[color:var(--mb-brand)]">
                      {recipientRole}
                    </span>
                  </div>
                  <p className="text-sm text-[color:var(--mb-muted)] flex items-center gap-1.5 truncate">
                    <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    Private and confidential
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 h-12 w-12 rounded-md flex items-center justify-center text-[color:var(--mb-muted)] hover:bg-[color:var(--mb-surface-2)] hover:text-[color:var(--mb-ink)] transition interactive-tap"
                  aria-label="Close chat"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* ── Message Body ── */}
              <div
                role="log"
                aria-live="polite"
                aria-label="Messages"
                className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-[color:var(--mb-ground)] custom-scrollbar"
              >
                {loading ? (
                  <div className="flex flex-col h-full items-center justify-center gap-3 text-[color:var(--mb-muted)]">
                    <Spinner size={28} className="text-[color:var(--mb-brand)]" />
                    <span>Loading secure messages…</span>
                  </div>
                ) : error ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-6">
                    <AlertTriangle className="h-8 w-8 text-[color:var(--mb-urgent)]" aria-hidden="true" />
                    <p role="alert" className="font-medium text-[color:var(--mb-urgent)]">
                      {error}
                    </p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center gap-3 px-6">
                    <div className="h-14 w-14 rounded-md bg-[color:var(--mb-brand-bg)] flex items-center justify-center border-2 border-[color:var(--mb-brand)]">
                      <Lock className="h-6 w-6 text-[color:var(--mb-brand)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-[color:var(--mb-ink)]">Confidential counseling thread</p>
                      <p className="text-[color:var(--mb-muted)] mt-1 max-w-xs">
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
                        <div className="flex-1 h-0.5 bg-[color:var(--mb-line)]" />
                        <span className="text-sm text-[color:var(--mb-muted)] font-medium px-1">
                          {formatDayLabel(dayMsgs[0]?.timestamp)}
                        </span>
                        <div className="flex-1 h-0.5 bg-[color:var(--mb-line)]" />
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
                                <div className="h-6 w-6 rounded-full bg-[color:var(--mb-panel)] flex items-center justify-center text-[color:var(--mb-panel-ink)] text-xs font-bold shrink-0">
                                  {(msg.senderName || "?").slice(0, 1).toUpperCase()}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-col max-w-[78%]">
                              {!isMe && isFirst && (
                                <span className="text-sm text-[color:var(--mb-muted)] ml-1 mb-1 font-medium">
                                  {msg.senderName || "Counselor"}
                                </span>
                              )}

                              <div
                                className={`px-3.5 py-2.5 whitespace-pre-wrap break-words ${
                                  isMe
                                    ? `bg-[color:var(--mb-panel)] text-[color:var(--mb-panel-ink)] ${
                                        isFirst && isLast
                                          ? "rounded-2xl"
                                          : isFirst
                                            ? "rounded-2xl rounded-br-md"
                                            : isLast
                                              ? "rounded-2xl rounded-tr-md"
                                              : "rounded-lg rounded-r-md"
                                      }`
                                    : `bg-[color:var(--mb-surface)] border-2 border-[color:var(--mb-line)] text-[color:var(--mb-ink)] ${
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
                                <span
                                  className={`text-sm text-[color:var(--mb-muted)] mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}
                                >
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
                <div className="px-3 py-2 border-t-2 border-[color:var(--mb-line)] bg-[color:var(--mb-ground)] overflow-x-auto custom-scrollbar flex gap-2 shrink-0">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => {
                        setInputText(reply);
                        inputRef.current?.focus();
                      }}
                      className="min-h-[44px] shrink-0 whitespace-nowrap rounded-md border-2 border-[color:var(--mb-line)] bg-[color:var(--mb-surface)] px-3 py-1.5 text-sm text-[color:var(--mb-ink)] hover:border-[color:var(--mb-muted)] transition"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Input Bar ── */}
              <form
                onSubmit={handleSend}
                className="flex items-end gap-2.5 px-3 py-3 bg-[color:var(--mb-ground)] border-t-2 border-[color:var(--mb-line)] shrink-0"
              >
                <div className="flex-1 relative">
                  <label htmlFor="chat-message" className="sr-only">
                    Message
                  </label>
                  <textarea
                    id="chat-message"
                    ref={inputRef}
                    maxLength={2000}
                    rows={1}
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a confidential message…"
                    className="mb-field resize-none overflow-hidden leading-relaxed"
                    style={{ height: "48px" }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="mb-btn mb-btn-solid shrink-0 !h-12 !w-12 !min-h-0 !p-0"
                  aria-label="Send message"
                >
                  {sending ? <Spinner size={18} /> : <Send className="h-5 w-5" aria-hidden="true" />}
                </button>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
}
