import { useMemo, useEffect, useState } from 'react';

interface WordEmergenceProps {
  words: string[];
}

export function WordEmergence({ words }: WordEmergenceProps) {
  const [animatedWords, setAnimatedWords] = useState<Set<string>>(new Set());

  // Calculate word frequencies
  const wordData = useMemo(() => {
    const counts = new Map<string, number>();
    words.forEach(word => {
      const normalized = word.toLowerCase().trim();
      if (normalized) {
        counts.set(normalized, (counts.get(normalized) || 0) + 1);
      }
    });

    return Array.from(counts.entries())
      .map(([word, count]) => ({
        word,
        count,
        isNew: !animatedWords.has(word),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 24);
  }, [words, animatedWords]);

  // Track which words have been animated
  useEffect(() => {
    const newWords = wordData.filter(w => w.isNew).map(w => w.word);
    if (newWords.length > 0) {
      setAnimatedWords(prev => new Set([...prev, ...newWords]));
    }
  }, [wordData]);

  const maxCount = Math.max(...wordData.map(d => d.count), 1);

  if (wordData.length === 0) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'var(--text-tertiary)' }} className="font-display italic">
          Words will emerge from the void...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="obs-etched text-center">Emerging Words</p>

      {/* Word constellation */}
      <div
        className="relative min-h-[200px] flex flex-wrap justify-center items-center gap-4 py-8"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(201, 165, 92, 0.05) 0%, transparent 70%)',
        }}
      >
        {wordData.map(({ word, count, isNew }, index) => {
          // Calculate size based on frequency
          const ratio = count / maxCount;
          const fontSize = 1 + ratio * 1.5; // 1rem to 2.5rem

          return (
            <span
              key={word}
              className={`word-discovered ${isNew ? 'animate-discover' : ''}`}
              style={{
                fontSize: `${fontSize}rem`,
                opacity: 0.6 + ratio * 0.4,
                animationDelay: `${index * 50}ms`,
              }}
              title={`${count} occurrence${count > 1 ? 's' : ''}`}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Recent stream */}
      <div className="text-center space-y-2">
        <p className="obs-etched">Recent Discoveries</p>
        <div className="flex flex-wrap justify-center gap-2">
          {words.slice(0, 8).map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="font-mono text-sm px-3 py-1 rounded animate-discover"
              style={{
                background: 'var(--ink-deepest)',
                border: '1px solid var(--ink-border)',
                color: i === 0 ? 'var(--brass)' : 'var(--text-secondary)',
                animationDelay: `${i * 100}ms`,
              }}
            >
              {word}
            </span>
          ))}
          <span
            className="animate-cursor"
            style={{ color: 'var(--brass)' }}
          >
            ▌
          </span>
        </div>
      </div>
    </div>
  );
}
