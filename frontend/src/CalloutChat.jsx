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
    fetch("/api/callout/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((res) => res.json())
      .then((data) => setConversationId(data.conversationId))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || !conversationId) return;
    const userText = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/callout/conversations/${conversationId}/messages`, {
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
          disabled={loading || !conversationId}
        />
        <button type="submit" disabled={loading || !input.trim() || !conversationId}>
          {loading ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
