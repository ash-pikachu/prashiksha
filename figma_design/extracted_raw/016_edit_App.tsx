=== OLD ===
function LeftPanel() {
  return (
    <div className="relative flex flex-col justify-between h-full px-12 py-14 overflow-hidden select-none" style={{ minHeight: 560 }}>
=== NEW ===
function LeftPanel({ quoteIndex, fadeIn }: { quoteIndex: number; fadeIn: boolean }) {
  const q = QUOTES[quoteIndex];
  return (
    <div className="relative flex flex-col justify-between h-full px-12 py-14 overflow-hidden select-none" style={{ minHeight: 560 }}>