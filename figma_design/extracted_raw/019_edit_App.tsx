=== OLD ===
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setMounted(true); }, []);
=== NEW ===
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState("");
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuoteIndex((i) => (i + 1) % QUOTES.length);
        setFadeIn(true);
      }, 420);
    }, 4500);
    return () => clearInterval(interval);
  }, []);