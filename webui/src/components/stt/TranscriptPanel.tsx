import { useState } from 'react'
import {
  Badge,
  Button,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  cn,
} from '../../ui'
import {
  toSrt,
  toVtt,
  type Segment,
  type TranscriptionResult,
  type Word,
} from '../../lib/sttApi'

function ts(s: number): string {
  // Round to deciseconds first so e.g. 59.97s renders 1:00.0, never 0:60.0.
  const ds = Math.round(s * 10)
  const m = Math.floor(ds / 600)
  const rem = (ds % 600) / 10
  return `${m}:${rem < 10 ? '0' : ''}${rem.toFixed(1)}`
}

function download(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Words belonging to a segment, from the flattened top-level `words` list
 * (segments no longer carry per-word entries, matching OpenAI). */
function wordsForSegment(words: Word[] | undefined, seg: Segment): Word[] {
  if (!words?.length) return []
  return words.filter((w) => w.start >= seg.start && w.start < seg.end)
}

export function TranscriptPanel({
  result,
}: {
  result: TranscriptionResult
}) {
  const [copied, setCopied] = useState(false)
  const [view, setView] = useState<'text' | 'segments'>('text')

  const hasSegments = Boolean(result.segments?.length)
  const hasWords = Boolean(result.words?.length)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {result.language && (
            <Badge variant="accent">lang: {result.language}</Badge>
          )}
          {typeof result.duration === 'number' && (
            <Badge>audio: {result.duration.toFixed(1)}s</Badge>
          )}
          <Badge variant="muted">{result.text.length} chars</Badge>
          {hasSegments && (
            <div className="ml-1 inline-flex overflow-hidden rounded-lg border border-border text-xs">
              <button
                type="button"
                onClick={() => setView('text')}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  view === 'text'
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface text-muted hover:text-fg',
                )}
              >
                Text
              </button>
              <button
                type="button"
                onClick={() => setView('segments')}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  view === 'segments'
                    ? 'bg-accent text-accent-fg'
                    : 'bg-surface text-muted hover:text-fg',
                )}
              >
                Segments
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => download('transcript.txt', result.text, 'text/plain')}
            disabled={!result.text}
          >
            <DownloadIcon className="text-[1rem]" /> .txt
          </Button>
          {hasSegments && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  download(
                    'transcript.srt',
                    toSrt(result.segments!),
                    'application/x-subrip',
                  )
                }
              >
                <DownloadIcon className="text-[1rem]" /> .srt
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  download('transcript.vtt', toVtt(result.segments!), 'text/vtt')
                }
              >
                <DownloadIcon className="text-[1rem]" /> .vtt
              </Button>
            </>
          )}
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? (
              <>
                <CheckIcon className="text-[1rem] text-success" /> Copied
              </>
            ) : (
              <>
                <CopyIcon className="text-[1rem]" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      {view === 'text' || !hasSegments ? (
        <div className="max-h-[26rem] overflow-auto rounded-xl border border-border bg-surface-2/50 p-4">
          {result.text ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
              {result.text}
            </p>
          ) : (
            <p className="text-sm italic text-faint">
              (No speech detected.)
            </p>
          )}
        </div>
      ) : (
        <div className="max-h-[26rem] space-y-1.5 overflow-auto rounded-xl border border-border bg-surface-2/50 p-3">
          {result.segments!.map((seg) => {
            const segWords = wordsForSegment(result.words, seg)
            return (
              <div
                key={seg.id}
                className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-surface"
              >
                <span className="shrink-0 pt-0.5 font-mono text-[0.7rem] tabular-nums text-faint">
                  {ts(seg.start)}
                </span>
                <p className="text-sm leading-relaxed text-fg">
                  {segWords.length > 0
                    ? segWords.map((w, i) => (
                        <span
                          key={i}
                          title={`${w.start.toFixed(2)}s – ${w.end.toFixed(2)}s · p=${w.probability.toFixed(2)}`}
                          className="rounded px-0.5 hover:bg-accent-soft hover:text-accent"
                        >
                          {w.word}
                        </span>
                      ))
                    : seg.text}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {hasWords && view === 'text' && (
        <p className="text-xs text-faint">
          {result.words!.length} word timestamps available — switch to the
          Segments view to inspect them.
        </p>
      )}
    </div>
  )
}
