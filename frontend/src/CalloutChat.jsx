import { useEffect, useRef, useState } from "react";

export default function CalloutChat() {
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRetrieved, setLastRetrieved] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);
    setError(null);
    try {
      // The conversation row is only created here, on the first real message
      // — not speculatively on mount — so browsing to this tab and leaving
      // doesn't litter the DB (and the Second Opinion dropdown) with empty
      // conversations.
      let id = conversationId;
      if (!id) {
        const convRes = await fetch("/api/callout/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        const convData = await convRes.json();
        if (!convRes.ok) throw new Error(convData.error || "Couldn't start a conversation.");
        id = convData.conversationId;
        setConversationId(id);
      }

      const res = await fetch(`/api/callout/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setLastRetrieved(data.retrieved || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="callout">
      <div className="callout-messages">
        {messages.length === 0 && (
          <p className="callout-empty">
            Ask "is this a good idea" or "X or Y?" and get a direct answer. Mention something
            from a past conversation and it'll try to recall it.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`callout-bubble ${m.role}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="callout-bubble assistant loading">...</div>}
        <div ref={bottomRef} />
      </div>

      {lastRetrieved.length > 0 && (
        <div className="callout-retrieved">
          <div className="callout-retrieved-label">
            Pulled from {lastRetrieved.length} past message{lastRetrieved.length === 1 ? "" : "s"}
          </div>
          <ul>
            {lastRetrieved.map((r, i) => (
              <li key={i}>
                <span className="callout-retrieved-role">{r.role}:</span> {r.content}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Is this a good idea? X or Y?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
