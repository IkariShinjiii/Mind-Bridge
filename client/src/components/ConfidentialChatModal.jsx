import React, { useState, useEffect, useRef } from "react";
import { getMessages, sendMessage } from "../api";
import { useAuth } from "../AuthContext.jsx";
import Spinner from "./Spinner";

function safeFormatTime(val) {
  if (!val) return "";
  const date = new Date(val);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export default function ConfidentialChatModal({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientRole = "counselor",
}) {
  const { currentUser, userRole, userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const currentUserId = currentUser?.uid;
  const currentUserName = userData?.name || currentUser?.displayName || (userRole === "counselor" ? "Counselor" : "Student");

  // Consistent deterministic threadId regardless of who opened first
  const threadId =
    currentUserId && recipientId
      ? [currentUserId, recipientId].sort().join("_thread_")
      : null;

  async function loadThreadMessages() {
    if (!threadId) return;
    try {
      const list = await getMessages(threadId);
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading chat", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isOpen && threadId) {
      setLoading(true);
      loadThreadMessages();
      // Polling interval every 4 seconds for lively feel
      const interval = setInterval(loadThreadMessages, 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e?.preventDefault();
    if (!inputText.trim() || sending || !threadId) return;

    const textToSend = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const newMsg = await sendMessage(threadId, {
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: userRole || "student",
        text: textToSend,
      });

      if (newMsg) {
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-fade-up">
      <div className="flex h-[560px] w-full max-w-lg flex-col rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 bg-gray-950/80 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 font-bold text-sm">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm sm:text-base">
                  {recipientName || "Counseling Discussion"}
                </h3>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cyan-300 border border-cyan-500/20">
                  {recipientRole}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <span>🔒</span>
                <span>Confidential Guidance Channel</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        {/* Message Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-950/40">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-gray-400 gap-2">
              <Spinner size={16} /> Loading confidential messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center p-6 text-gray-500">
              <div className="mb-2 text-2xl">🌱</div>
              <p className="text-sm font-medium text-gray-300">Confidential Direct Thread</p>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                Send a secure question, follow-up note, or appointment clarification. Only you and
                the designated guidance counselor have access.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400 px-1">
                    <span>{isMe ? "You" : msg.senderName}</span>
                    <span>•</span>
                    <span>{safeFormatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isMe
                        ? "bg-cyan-600 text-white rounded-tr-none"
                        : "bg-gray-800 border border-gray-700/80 text-gray-100 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestions for Convenience */}
        <div className="border-t border-gray-800/80 bg-gray-900/60 px-3 py-1.5 overflow-x-auto flex gap-1.5 scrollbar-none">
          {userRole === "student" ? (
            <>
              <button
                type="button"
                onClick={() => setInputText("Thank you for reviewing my wellness check-in.")}
                className="whitespace-nowrap rounded-lg border border-gray-800 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300 hover:border-cyan-500/50 hover:text-white transition"
              >
                Thank you for reviewing
              </button>
              <button
                type="button"
                onClick={() => setInputText("Can we reschedule our upcoming counseling session?")}
                className="whitespace-nowrap rounded-lg border border-gray-800 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300 hover:border-cyan-500/50 hover:text-white transition"
              >
                Can we reschedule?
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setInputText("I reviewed your recent check-in. How are your classes going this week?")}
                className="whitespace-nowrap rounded-lg border border-gray-800 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300 hover:border-cyan-500/50 hover:text-white transition"
              >
                Check-in follow-up
              </button>
              <button
                type="button"
                onClick={() => setInputText("Please feel free to drop by the Guidance Office or book a slot anytime.")}
                className="whitespace-nowrap rounded-lg border border-gray-800 bg-gray-800/60 px-2 py-0.5 text-[10px] text-gray-300 hover:border-cyan-500/50 hover:text-white transition"
              >
                Drop-by guidance invite
              </button>
            </>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="border-t border-gray-800 bg-gray-950/90 p-2.5 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a confidential message..."
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-cyan-500 transition disabled:opacity-40"
          >
            {sending ? <Spinner size={14} /> : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
