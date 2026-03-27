import { useState, useRef, useEffect } from "react";

const LANGUAGES = ["English", "French", "Spanish", "German", "Italian", "Portuguese"];


const FLAG_IMAGES = {
  English: "gb", French: "fr", Spanish: "es",
  German: "de", Italian: "it", Portuguese: "br",
};

function FlagImg({ lang, size = 20 }) {
  const code = FLAG_IMAGES[lang];
  if (!code) return <span style={{ fontSize: "1.1rem" }}>🌐</span>;
  return (
    <img
      src={`https://flagcdn.com/w${size}/${code}.png`}
      alt={lang}
      style={{ width: size, height: "auto", borderRadius: "2px", verticalAlign: "middle" }}
    />
  );
}

const LANG_COLORS = {
  English:    { accent: "#4a9eff", bg: "rgba(74,158,255,0.07)",   border: "rgba(74,158,255,0.25)" },
  French:     { accent: "#e8526a", bg: "rgba(232,82,106,0.07)",   border: "rgba(232,82,106,0.25)" },
  Spanish:    { accent: "#f4a242", bg: "rgba(244,162,66,0.07)",   border: "rgba(244,162,66,0.25)" },
  German:     { accent: "#9ba8b8", bg: "rgba(155,168,184,0.07)",  border: "rgba(155,168,184,0.25)" },
  Italian:    { accent: "#5ec47a", bg: "rgba(94,196,122,0.07)",   border: "rgba(94,196,122,0.25)" },
  Portuguese: { accent: "#4ecdc4", bg: "rgba(78,205,196,0.07)",   border: "rgba(78,205,196,0.25)" },
};

const EXAMPLES = ["serendipity", "Schadenfreude", "saudade", "renaissance", "zeitgeist", "wanderlust"];
const STORAGE_KEY = "linguabot-words";

async function callAPI(word) {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });
  if (!response.ok) throw new Error('API error');
  return response.json();
}

async function callImageAPI(word, imageQuery, englishTranslation) {
  try {
    const response = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, imageQuery, englishTranslation }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.imageUrl || null;
  } catch (_) { return null; }
}

export default function LinguaBot() {
  const [view, setView] = useState("chat");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState([]);
  const [reportFilter, setReportFilter] = useState("month");
  const [expandedWord, setExpandedWord] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setWords(JSON.parse(saved));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function saveWord(wordData) {
    const entry = { ...wordData, date: new Date().toISOString() };
    const updated = [entry, ...words];
    setWords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  async function handleSubmit(wordInput) {
    const w = (wordInput || input).trim();
    if (!w || loading) return;
    setInput("");

    // Return cached result instantly
    const cached = words.find(wd => wd.word.toLowerCase() === w.toLowerCase());
    if (cached) {
      setMessages(prev => [...prev, { type: "user", word: w }, { type: "bot", data: cached }]);
      return;
    }

    setLoading(true);
    setMessages(prev => [...prev, { type: "user", word: w }]);
    try {
      const result = await callAPI(w);
      const msgId = Date.now();

      // Show translation immediately, image loads in background
      saveWord(result);
      setMessages(prev => [...prev, { type: "bot", data: result, id: msgId }]);
      setLoading(false);

      // Fetch image async — update card when ready
      const englishTranslation = result.translations?.English?.translation;
      callImageAPI(result.word, result.imageQuery, englishTranslation).then(imageUrl => {
        if (!imageUrl) return;
        setMessages(prev => prev.map(msg =>
          msg.id === msgId ? { ...msg, data: { ...msg.data, imageUrl } } : msg
        ));
        setWords(prev => {
          const updated = prev.map(wd =>
            wd.word === result.word && !wd.imageUrl ? { ...wd, imageUrl } : wd
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      });
    } catch (e) {
      setMessages(prev => [...prev, { type: "error", text: "Something went wrong. Please try again." }]);
      setLoading(false);
    }
  }

  function getFilteredWords() {
    const now = new Date();
    return words.filter((w) => {
      const d = new Date(w.date);
      if (reportFilter === "week") return (now - d) < 7 * 86400000;
      if (reportFilter === "month") return (now - d) < 30 * 86400000;
      return true;
    });
  }

  const filteredWords = getFilteredWords();
  const langCounts = filteredWords.reduce((acc, w) => {
    acc[w.detectedLanguage] = (acc[w.detectedLanguage] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={styles.root}>
      <div style={styles.bgGrain} />
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoAccent}>Lingua</span>
          <span style={styles.logoItalic}>Bot</span>
        </div>
        <nav style={styles.nav}>
          {["chat", "report"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ ...styles.navBtn, ...(view === v ? styles.navBtnActive : {}) }}>
              {v === "chat" ? "💬 Explore" : "📊 Report"}
            </button>
          ))}
        </nav>
        <div style={styles.wordCount}>{words.length} words learned</div>
      </header>

      {view === "chat" && (
        <div style={styles.chatLayout}>
          <div style={styles.messages}>
            {messages.length === 0 && (
              <div style={styles.welcome}>
                <div style={styles.welcomeIcon}>🌍</div>
                <h2 style={styles.welcomeTitle}>Explore any word</h2>
                <p style={styles.welcomeSub}>Type a word in any language and discover its meaning, origin, and usage across 6 languages.</p>
                <div style={styles.examples}>
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => handleSubmit(ex)} style={styles.exampleChip}>{ex}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={styles.messageWrap}>
                {msg.type === "user" && <div style={styles.userMsgRow}><div style={styles.userBubble}>{msg.word}</div></div>}
                {msg.type === "bot" && <WordCard data={msg.data} />}
                {msg.type === "error" && <div style={styles.errorMsg}>{msg.text}</div>}
              </div>
            ))}
            {loading && (
              <div style={styles.loadingWrap}>
                <div style={styles.loadingDots}>
                  {[0, 0.2, 0.4].map((d, i) => <span key={i} style={{ ...styles.dot, animationDelay: `${d}s` }} />)}
                </div>
                <span style={styles.loadingText}>Exploring the word...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={styles.inputArea}>
            <div style={styles.inputWrap}>
              <input
                style={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Type any word in any language..."
                disabled={loading}
              />
              <button onClick={() => handleSubmit()} disabled={loading || !input.trim()} style={styles.sendBtn}>
                {loading ? "..." : "→"}
              </button>
            </div>
            <p style={styles.inputHint}>Press Enter or click → to explore</p>
          </div>
        </div>
      )}

      {view === "report" && (
        <div style={styles.reportLayout}>
          <div style={styles.filterRow}>
            {["week", "month", "all"].map((f) => (
              <button key={f} onClick={() => setReportFilter(f)} style={{ ...styles.filterBtn, ...(reportFilter === f ? styles.filterBtnActive : {}) }}>
                {f === "week" ? "Last 7 days" : f === "month" ? "Last 30 days" : "All time"}
              </button>
            ))}
          </div>
          <div style={styles.statsRow}>
            {[
              { num: filteredWords.length, label: "Words Explored" },
              { num: Object.keys(langCounts).length, label: "Languages Found" },
              { num: filteredWords.length * 6, label: "Translations Seen" },
            ].map((s) => (
              <div key={s.label} style={styles.statCard}>
                <div style={styles.statNum}>{s.num}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
          {Object.keys(langCounts).length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Words by Origin Language</h3>
              <div style={styles.langBreakdown}>
                {Object.entries(langCounts).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                  <div key={lang} style={styles.langRow}>
                    <span style={styles.langName}>{lang}</span>
                    <div style={styles.barWrap}><div style={{ ...styles.bar, width: `${(count / filteredWords.length) * 100}%` }} /></div>
                    <span style={styles.langCount}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Words Explored</h3>
            {filteredWords.length === 0 ? (
              <div style={styles.emptyState}>No words yet in this period. Go explore some! 🌍</div>
            ) : (
              <div style={styles.wordList}>
                {filteredWords.map((w, i) => (
                  <div key={i} style={styles.accordionItem}>
                    <button onClick={() => setExpandedWord(expandedWord === i ? null : i)} style={styles.accordionHeader}>
                      <div style={styles.wordListLeft}>
                        <span style={styles.wordListWord}>{w.word}</span>
                        <span style={styles.wordListLang}>{w.detectedLanguage} · {w.wordType}</span>
                      </div>
                      <div style={styles.accordionRight}>
                        <span style={styles.wordListDate}>{new Date(w.date).toLocaleDateString()}</span>
                        <span style={{ ...styles.chevron, transform: expandedWord === i ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                      </div>
                    </button>
                    {expandedWord === i && (
                      <div style={styles.accordionBody}>
                        <p style={styles.accordionExplanation}>{w.explanation}</p>
                        {w.imageUrl && <img src={w.imageUrl} alt={`Image related to ${w.word}`} style={styles.cardImage} />}
                        <div style={styles.accordionLangGrid}>
                          {LANGUAGES.map((lang) => {
                            const t = w.translations?.[lang];
                            if (!t) return null;
                            return (
                              <div key={lang} style={styles.accordionLangCard}>
                                <div style={styles.langCardHeader}>
                                  <FlagImg lang={lang} />
                                  <span style={styles.langCardName}>{lang}</span>
                                  <span style={styles.langTranslation}>{t.translation}</span>
                                                  <button onClick={() => speakWord(t.translation, lang)} style={styles.playBtn} title="Play pronunciation">
                                    🔊
                                  </button>
                                </div>
                                <p style={styles.langExample}>"{t.example}"</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,400&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0c0c0f; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes accordionOpen {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #2a2a35; border-radius: 2px; }
        .lang-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .lang-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.4); }
      `}</style>
    </div>
  );
}

const LANG_CODES = {
  English: 'en-US', French: 'fr-FR', Spanish: 'es-ES',
  German: 'de-DE', Italian: 'it-IT', Portuguese: 'pt-BR',
};

function speakWord(text, lang) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LANG_CODES[lang] || 'en-US';
  window.speechSynthesis.speak(utterance);
}

function WordCard({ data }) {

  return (
    <div style={styles.botCard}>
      <div style={styles.cardHeader}>
        <div style={{ flex: 1 }}>
          <div style={styles.cardWordTitle}>{data.word}</div>
          <div style={styles.cardBadges}>
            <span style={styles.badgeLang}><FlagImg lang={data.detectedLanguage} /> {data.detectedLanguage}</span>
            <span style={styles.badgeType}>{data.wordType}</span>
          </div>
        </div>
        {data.imageUrl && (
          <img
            src={data.imageUrl}
            alt={`Image related to ${data.word}`}
            style={styles.cardThumb}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
      <p style={styles.cardExplanation}>{data.explanation}</p>
      <div style={styles.langGrid}>
        {LANGUAGES.map((lang) => {
          const t = data.translations?.[lang];
          if (!t) return null;
          const lc = LANG_COLORS[lang] || {};
          return (
            <div key={lang} className="lang-card" style={{ ...styles.langCard, background: lc.bg, borderColor: lc.border }}>
              <div style={styles.langCardHeader}>
                <FlagImg lang={lang} />
                <span style={styles.langCardName}>{lang}</span>
                <span style={{ ...styles.langTranslation, color: lc.accent }}>{t.translation}</span>
                <button onClick={() => speakWord(t.translation, lang)} style={{ ...styles.playBtn, color: lc.accent }} title="Play pronunciation">
                  🔊
                </button>
              </div>
              <p style={styles.langExample}>"{t.example}"</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  root: { minHeight: "100vh", background: "#0c0c0f", color: "#e8e2d9", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" },
  bgGrain: { position: "fixed", inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")", backgroundSize: "150px", pointerEvents: "none", zIndex: 0 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 32px", borderBottom: "1px solid #1e1e28", background: "#0e0e14", position: "relative", zIndex: 10, flexWrap: "wrap", gap: "12px" },
  logo: { fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", letterSpacing: "-0.5px" },
  logoAccent: { color: "#c8a96e" },
  logoItalic: { color: "#7eb8c8", fontStyle: "italic" },
  nav: { display: "flex", gap: "4px", background: "#161620", padding: "4px", borderRadius: "10px" },
  navBtn: { padding: "8px 20px", border: "none", background: "transparent", color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", cursor: "pointer", borderRadius: "7px", transition: "all 0.2s" },
  navBtnActive: { background: "#1e1e2e", color: "#c8a96e" },
  wordCount: { fontSize: "0.8rem", color: "#444", fontFamily: "'DM Mono', monospace" },
  chatLayout: { flex: 1, display: "flex", flexDirection: "column", maxWidth: "760px", margin: "0 auto", width: "100%", padding: "0 20px", position: "relative", zIndex: 1, height: "calc(100vh - 73px)" },
  messages: { flex: 1, overflowY: "auto", padding: "32px 0 16px", display: "flex", flexDirection: "column", gap: "20px" },
  welcome: { textAlign: "center", padding: "60px 20px", animation: "fadeUp 0.6s forwards" },
  welcomeIcon: { fontSize: "3rem", marginBottom: "16px" },
  welcomeTitle: { fontFamily: "'Playfair Display', serif", fontSize: "2.2rem", color: "#c8a96e", marginBottom: "12px" },
  welcomeSub: { color: "#555", fontSize: "0.95rem", lineHeight: "1.7", maxWidth: "380px", margin: "0 auto 28px" },
  examples: { display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" },
  exampleChip: { padding: "8px 18px", border: "1px solid #2a2a35", borderRadius: "20px", background: "transparent", color: "#666", fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", cursor: "pointer" },
  messageWrap: { animation: "fadeUp 0.4s forwards" },
  userMsgRow: { display: "flex", justifyContent: "flex-end" },
  userBubble: { background: "#c8a96e", color: "#0c0c0f", padding: "12px 24px", borderRadius: "20px 20px 4px 20px", fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, maxWidth: "300px" },
  errorMsg: { background: "#1e1015", border: "1px solid #3a1a1a", color: "#c87e7e", padding: "16px", borderRadius: "10px", fontSize: "0.9rem" },
  loadingWrap: { display: "flex", alignItems: "center", gap: "12px", padding: "16px" },
  loadingDots: { display: "flex", gap: "6px" },
  dot: { width: "8px", height: "8px", borderRadius: "50%", background: "#c8a96e", display: "inline-block", animation: "bounce 1.2s infinite" },
  loadingText: { color: "#444", fontSize: "0.85rem", fontStyle: "italic" },
  inputArea: { padding: "16px 0 24px", borderTop: "1px solid #1e1e28" },
  inputWrap: { display: "flex", gap: "10px", background: "#161620", border: "1px solid #2a2a35", borderRadius: "14px", padding: "8px 8px 8px 20px" },
  input: { flex: 1, background: "transparent", border: "none", outline: "none", color: "#e8e2d9", fontFamily: "'DM Sans', sans-serif", fontSize: "1rem" },
  sendBtn: { background: "#c8a96e", color: "#0c0c0f", border: "none", borderRadius: "10px", width: "44px", height: "44px", fontSize: "1.2rem", cursor: "pointer", fontWeight: "bold" },
  inputHint: { fontSize: "0.75rem", color: "#333", textAlign: "center", marginTop: "8px" },
  botCard: { background: "rgba(14,14,20,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "28px", width: "100%" },
  cardHeader: { display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "16px" },
  cardWordTitle: { fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#c8a96e" },
  cardBadges: { display: "flex", gap: "8px" },
  badgeLang: { padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontFamily: "'DM Mono', monospace", background: "rgba(200,169,110,0.1)", color: "#c8a96e", border: "1px solid rgba(200,169,110,0.25)" },
  badgeType: { padding: "4px 12px", borderRadius: "20px", fontSize: "0.75rem", fontFamily: "'DM Mono', monospace", background: "rgba(126,184,200,0.1)", color: "#7eb8c8", border: "1px solid rgba(126,184,200,0.25)" },
  cardExplanation: { color: "#999", lineHeight: "1.75", fontSize: "0.95rem", marginBottom: "24px", paddingBottom: "20px", borderBottom: "1px solid #1e1e28" },
  cardImage: { width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: "16px" },
  cardThumb: { width: "90px", height: "90px", objectFit: "cover", borderRadius: "10px", flexShrink: 0, border: "1px solid #1e1e28" },
  langGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" },
  langCard: { background: "#161620", borderRadius: "10px", padding: "14px 16px", border: "1px solid #1e1e28" },
  langCardHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" },
  langFlag: { fontSize: "1.1rem" },
  langCardName: { fontSize: "0.75rem", color: "#555", fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.5px" },
  langTranslation: { marginLeft: "auto", color: "#c8a96e", fontFamily: "'Playfair Display', serif", fontSize: "1rem" },
  playBtn: { background: "transparent", border: "none", color: "#7eb8c8", cursor: "pointer", fontSize: "1rem", padding: "4px", borderRadius: "4px", transition: "background 0.2s" },
  langExample: { color: "#666", fontSize: "0.82rem", lineHeight: "1.6", fontStyle: "italic" },
  reportLayout: { flex: 1, overflowY: "auto", padding: "32px", maxWidth: "900px", margin: "0 auto", width: "100%", position: "relative", zIndex: 1 },
  filterRow: { display: "flex", gap: "8px", marginBottom: "28px" },
  filterBtn: { padding: "8px 20px", border: "1px solid #2a2a35", borderRadius: "20px", background: "transparent", color: "#555", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", cursor: "pointer" },
  filterBtnActive: { background: "#1e1e2e", borderColor: "#c8a96e", color: "#c8a96e" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" },
  statCard: { background: "#0e0e14", border: "1px solid #1e1e28", borderRadius: "14px", padding: "24px", textAlign: "center" },
  statNum: { fontFamily: "'Playfair Display', serif", fontSize: "2.5rem", color: "#c8a96e", marginBottom: "6px" },
  statLabel: { color: "#555", fontSize: "0.82rem", fontFamily: "'DM Mono', monospace" },
  section: { marginBottom: "32px" },
  sectionTitle: { fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#e8e2d9", marginBottom: "16px", paddingBottom: "10px", borderBottom: "1px solid #1e1e28" },
  langBreakdown: { display: "flex", flexDirection: "column", gap: "10px" },
  langRow: { display: "flex", alignItems: "center", gap: "12px" },
  langName: { color: "#888", fontSize: "0.85rem", width: "90px", flexShrink: 0 },
  barWrap: { flex: 1, background: "#161620", borderRadius: "4px", height: "8px", overflow: "hidden" },
  bar: { height: "100%", background: "#c8a96e", borderRadius: "4px", transition: "width 0.6s ease" },
  langCount: { color: "#c8a96e", fontFamily: "'DM Mono', monospace", fontSize: "0.82rem", width: "24px", textAlign: "right" },
  wordList: { display: "flex", flexDirection: "column", gap: "8px" },
  accordionItem: { background: "#0e0e14", border: "1px solid #1e1e28", borderRadius: "12px", overflow: "hidden" },
  accordionHeader: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" },
  wordListLeft: { display: "flex", flexDirection: "column", gap: "4px" },
  wordListWord: { fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#c8a96e" },
  wordListLang: { fontSize: "0.75rem", color: "#555", fontFamily: "'DM Mono', monospace" },
  accordionRight: { display: "flex", alignItems: "center", gap: "16px" },
  wordListDate: { fontSize: "0.78rem", color: "#444", fontFamily: "'DM Mono', monospace" },
  chevron: { color: "#555", fontSize: "1rem", transition: "transform 0.25s ease", display: "inline-block" },
  accordionBody: { padding: "0 18px 18px", borderTop: "1px solid #1e1e28", animation: "accordionOpen 0.25s ease forwards" },
  accordionExplanation: { color: "#888", fontSize: "0.88rem", lineHeight: "1.7", padding: "14px 0", borderBottom: "1px solid #1e1e28", marginBottom: "14px", fontStyle: "italic" },
  accordionLangGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" },
  accordionLangCard: { background: "#161620", borderRadius: "8px", padding: "12px 14px", border: "1px solid #1e1e28" },
  emptyState: { color: "#444", textAlign: "center", padding: "40px", fontSize: "0.95rem" },
};
