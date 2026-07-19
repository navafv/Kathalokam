'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Play, Pause, RotateCcw, RotateCw, SkipForward,
  ArrowLeft, Loader2, AlertCircle, Headphones,
  CheckCircle2, Share2, Sparkles, ListMusic, X,
} from 'lucide-react'

interface Episode {
  id: string
  story_id: string
  episode_number: number
  title_malayalam: string
  audio_url: string | null
  duration_seconds: number | null
  status: string
}

interface Story {
  id: string
  title_malayalam: string
  title_english: string
  genre: string
  description: string
  cover_emoji: string
  total_episodes: number
  status: string
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number]

const COVER_COLORS = [
  { from: '#4F1B8C', via: '#7C3AED', to: '#1E0A4A' },
  { from: '#831843', via: '#DB2777', to: '#3B0764' },
  { from: '#064E3B', via: '#059669', to: '#1C1038' },
  { from: '#7C2D12', via: '#EA580C', to: '#1A0A2E' },
]

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function StoryClientPage({ storyId }: { storyId: string }) {
  const supabase = createClient()
  const [story, setStory] = useState<Story | null>(null)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false)
  const [finishedAll, setFinishedAll] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1)
  const [completedEpisodes, setCompletedEpisodes] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [dragTime, setDragTime] = useState(0)
  const [showEpisodeSheet, setShowEpisodeSheet] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const completed = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('completed_')) completed.add(k.replace('completed_', ''))
    }
    setCompletedEpisodes(completed)
  }, [])

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const { data: sd, error: se } = await supabase.from('stories').select('*').eq('id', storyId).single()
        if (se || !sd) throw new Error('കഥ കണ്ടെത്താനായില്ല (Story not found).')
        const { data: ed, error: ee } = await supabase.from('episodes').select('*')
          .eq('story_id', storyId).eq('status', 'audio_generated').order('episode_number', { ascending: true })
        if (ee) throw new Error('എപ്പിസോഡുകൾ ലഭ്യമാക്കാൻ കഴിഞ്ഞില്ല.')
        setStory(sd); setEpisodes(ed || [])
        if (ed?.length) setCurrentEpisode(ed[0])
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [storyId])

  useEffect(() => {
    if (!currentEpisode || !audioRef.current) return
    setFinishedAll(false)
    const audio = audioRef.current
    audio.src = currentEpisode.audio_url || ''
    audio.playbackRate = playbackSpeed
    audio.load()
    const saved = localStorage.getItem(`progress_${currentEpisode.id}`)
    if (saved) { const t = Number(saved); if (!isNaN(t) && t > 0) { audio.currentTime = t; setCurrentTime(t) } }
    else { audio.currentTime = 0; setCurrentTime(0) }
    if (shouldAutoPlay) { audio.play().catch(() => { }); setIsPlaying(true) }
    else setIsPlaying(false)
  }, [currentEpisode])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackSpeed
  }, [playbackSpeed])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || !currentEpisode || isDragging) return
    const t = audioRef.current.currentTime
    setCurrentTime(t)
    if (Math.floor(t) % 3 === 0 && t > 0)
      localStorage.setItem(`progress_${currentEpisode.id}`, Math.floor(t).toString())
  }, [currentEpisode, isDragging])

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration || currentEpisode?.duration_seconds || 0)
  }, [currentEpisode])

  const handleEnded = useCallback(() => {
    if (!currentEpisode) return
    localStorage.removeItem(`progress_${currentEpisode.id}`)
    localStorage.setItem(`completed_${currentEpisode.id}`, '1')
    setCompletedEpisodes(prev => new Set([...prev, currentEpisode.id]))
    setIsPlaying(false)
    const idx = episodes.findIndex(e => e.id === currentEpisode.id)
    if (idx !== -1 && idx < episodes.length - 1) { setShouldAutoPlay(true); setCurrentEpisode(episodes[idx + 1]) }
    else setFinishedAll(true)
  }, [currentEpisode, episodes])

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current || !currentEpisode) return
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false) }
    else { audioRef.current.play().catch(() => { }); setIsPlaying(true); setShouldAutoPlay(true) }
  }, [isPlaying, currentEpisode])

  const skipTime = useCallback((secs: number) => {
    if (!audioRef.current) return
    const t = Math.max(0, Math.min(duration, audioRef.current.currentTime + secs))
    audioRef.current.currentTime = t; setCurrentTime(t)
  }, [duration])

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragTime(Number(e.target.value)); setIsDragging(true)
  }
  const handleSeekCommit = () => {
    if (!audioRef.current) return
    audioRef.current.currentTime = dragTime; setCurrentTime(dragTime); setIsDragging(false)
  }

  const playEpisode = useCallback((ep: Episode) => {
    setShouldAutoPlay(true); setCurrentEpisode(ep)
    if (audioRef.current && currentEpisode?.id === ep.id) togglePlayPause()
    setShowEpisodeSheet(false)
  }, [currentEpisode, togglePlayPause])

  const playNextEpisode = useCallback(() => {
    if (!currentEpisode) return
    const idx = episodes.findIndex(e => e.id === currentEpisode.id)
    if (idx !== -1 && idx < episodes.length - 1) { setShouldAutoPlay(true); setCurrentEpisode(episodes[idx + 1]) }
  }, [currentEpisode, episodes])

  const cycleSpeed = useCallback(() => {
    setPlaybackSpeed(prev => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev)
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length]
    })
  }, [])

  const handleShare = useCallback(() => {
    if (navigator.share && story) navigator.share({ title: story.title_malayalam, text: `Listen to "${story.title_malayalam}" on Kathalokam!`, url: window.location.href }).catch(() => { })
    else navigator.clipboard?.writeText(window.location.href)
  }, [story])

  const currentIndex = currentEpisode ? episodes.findIndex(e => e.id === currentEpisode.id) : -1
  const progressPct = duration > 0 ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0
  const coverColor = COVER_COLORS[0]

  if (loading) return (
    <div className="min-h-screen bg-[#080C18] flex flex-col items-center justify-center gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
        <Headphones className="h-8 w-8 text-white" />
      </div>
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
        <span className="text-sm font-semibold text-white/70" style={{ fontFamily: 'var(--font-malayalam)' }}>
          കഥ ലോഡ് ചെയ്യുന്നു...
        </span>
      </div>
    </div>
  )

  if (error || !story) return (
    <div className="min-h-screen bg-[#080C18] p-6 flex items-center justify-center">
      <div className="max-w-md w-full p-8 rounded-2xl text-center space-y-4"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
          കഥ ലഭ്യമാക്കുന്നതിൽ പിശക്
        </h3>
        <p className="text-xs text-red-300">{error}</p>
        <Link href="/" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white min-h-[44px]"
          style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
          <ArrowLeft className="h-4 w-4" />
          <span>പ്രധാന പേജിലേക്ക്</span>
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#080C18] text-[#F0F0FF] pb-36" style={{ fontFamily: 'var(--font-inter)' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.45s ease-out forwards; }
        @keyframes celebration { 0%{transform:scale(0.8) rotate(-5deg);opacity:0} 60%{transform:scale(1.05) rotate(2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
        .celebrate { animation: celebration 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .seek-thumb::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:linear-gradient(135deg,#A855F7,#EC4899); cursor:pointer; border:2px solid #080C18; box-shadow:0 0 8px rgba(168,85,247,0.6); }
        .seek-thumb::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:#A855F7; cursor:pointer; border:2px solid #080C18; }
        .sheet-overlay { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .sheet-panel { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .wave-bar { animation: waveform 1.2s ease-in-out infinite; transform-origin: bottom; }
        @keyframes waveform { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
      `}</style>

      <audio ref={audioRef}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)}
        preload="metadata" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 py-4"
        style={{ background: 'rgba(8,12,24,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold min-h-[44px] px-2 -ml-2 rounded-lg text-white/60 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline" style={{ fontFamily: 'var(--font-malayalam)' }}>എല്ലാ കഥകളും</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
              <Headphones className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>കഥാലോകം</span>
          </div>
          <button onClick={() => setShowEpisodeSheet(true)}
            className="lg:hidden flex items-center gap-1.5 text-xs font-semibold min-h-[44px] min-w-[44px] justify-center rounded-lg text-white/60 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
            aria-label="Show episodes">
            <ListMusic className="h-5 w-5" />
          </button>
          <div className="hidden lg:block w-20" />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4 lg:flex lg:gap-8">
        <div className="flex-1 min-w-0">

          {/* Story header */}
          <section className="pb-8 border-b fade-up" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
              {/* Cover */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl flex items-center justify-center text-6xl sm:text-7xl shadow-2xl flex-shrink-0 relative overflow-hidden"
                style={{ background: `linear-gradient(160deg, ${coverColor.from}, ${coverColor.via}, ${coverColor.to})`, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="absolute inset-0 opacity-30"
                  style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                <span className="relative z-10">{story.cover_emoji || '📖'}</span>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold">
                  <span className="px-3 py-1.5 rounded-full uppercase tracking-wider"
                    style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.2))', border: '1px solid rgba(168,85,247,0.3)', color: '#C084FC' }}>
                    {story.genre}
                  </span>
                  <span className="font-semibold" style={{ color: 'rgba(240,240,255,0.5)' }}>
                    {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                  </span>
                  <span className="px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)', color: '#34D399' }}>
                    Free
                  </span>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold leading-tight text-white"
                    style={{ fontFamily: 'var(--font-malayalam)' }}>
                    {story.title_malayalam}
                  </h1>
                  {story.title_english && (
                    <p className="text-sm font-medium italic mt-1" style={{ color: 'rgba(240,240,255,0.45)' }}>
                      {story.title_english}
                    </p>
                  )}
                </div>

                {story.description && (
                  <p className="text-sm leading-relaxed max-w-xl hidden sm:block" style={{ color: 'rgba(240,240,255,0.6)' }}>
                    {story.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                  <button
                    onClick={() => {
                      if (episodes.length > 0) {
                        setShouldAutoPlay(true)
                        if (currentEpisode?.id === episodes[0].id && audioRef.current) togglePlayPause()
                        else setCurrentEpisode(episodes[0])
                      }
                    }}
                    disabled={episodes.length === 0}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-bold text-sm text-white min-h-[44px] disabled:opacity-40 hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                    style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)' }}>
                    <Play className="h-4 w-4 fill-white" />
                    <span style={{ fontFamily: 'var(--font-malayalam)' }}>
                      {isPlaying ? 'കേൾക്കുന്നു...' : 'കേട്ടു തുടങ്ങാം'}
                    </span>
                  </button>
                  <button onClick={handleShare}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-sm min-h-[44px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 text-white/70 hover:text-white"
                    style={{ border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                    <Share2 className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Mobile episode list */}
          <section className="py-6 space-y-3 lg:hidden">
            <h2 className="text-lg font-bold text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-malayalam)' }}>
              <Headphones className="h-5 w-5 text-purple-400" />
              <span>എപ്പിസോഡുകൾ ({episodes.length})</span>
            </h2>
            <EpisodeList episodes={episodes} currentEpisode={currentEpisode} isPlaying={isPlaying}
              completedEpisodes={completedEpisodes} onPlay={playEpisode} />
          </section>

          {/* Finished celebration */}
          {finishedAll && (
            <div className="mt-6 p-6 rounded-2xl text-center space-y-3 celebrate"
              style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.15))', border: '1px solid rgba(168,85,247,0.3)' }}>
              <Sparkles className="h-10 w-10 mx-auto animate-bounce" style={{ color: '#F5C842' }} />
              <h3 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
                🎉 എല്ലാ എപ്പിസോഡുകളും കഴിഞ്ഞു!
              </h3>
              <p className="text-sm" style={{ color: 'rgba(240,240,255,0.7)' }}>
                You've finished all episodes of "{story.title_malayalam}". Thank you for listening!
              </p>
              <div className="flex flex-wrap gap-3 justify-center pt-2">
                <button onClick={handleShare}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm min-h-[44px]"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)', color: 'white' }}>
                  <Share2 className="h-4 w-4" />
                  <span style={{ fontFamily: 'var(--font-malayalam)' }}>കഥ ഷെയർ ചെയ്യൂ</span>
                </button>
                <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm min-h-[44px] text-white hover:bg-white/10 transition"
                  style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                  <ArrowLeft className="h-4 w-4" />
                  <span style={{ fontFamily: 'var(--font-malayalam)' }}>കഥകളിലേക്ക്</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0">
          <div className="sticky top-20 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <Headphones className="h-4 w-4 text-purple-400" />
              <h2 className="font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
                എപ്പിസോഡുകൾ ({episodes.length})
              </h2>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              <EpisodeList episodes={episodes} currentEpisode={currentEpisode} isPlaying={isPlaying}
                completedEpisodes={completedEpisodes} onPlay={playEpisode} compact />
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom sheet */}
      {showEpisodeSheet && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 sheet-overlay lg:hidden" onClick={() => setShowEpisodeSheet(false)} />
          <div className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl shadow-2xl sheet-panel lg:hidden max-h-[80vh] flex flex-col"
            style={{ background: '#0F1428', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="px-4 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-bold text-white" style={{ fontFamily: 'var(--font-malayalam)' }}>
                എപ്പിസോഡുകൾ ({episodes.length})
              </h2>
              <button onClick={() => setShowEpisodeSheet(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pb-4">
              <EpisodeList episodes={episodes} currentEpisode={currentEpisode} isPlaying={isPlaying}
                completedEpisodes={completedEpisodes} onPlay={playEpisode} />
            </div>
          </div>
        </>
      )}

      {/* Sticky bottom player */}
      {currentEpisode && (
        <div className="fixed bottom-0 inset-x-0 z-50"
          style={{ background: 'rgba(10,8,30,0.97)', backdropFilter: 'blur(24px)', borderTop: '1px solid rgba(168,85,247,0.25)' }}>
          <div className="max-w-5xl mx-auto px-3 sm:px-6">

            {/* Seek bar */}
            <div className="relative pt-3 pb-1">
              <div className="relative h-5 flex items-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div className="h-full rounded-full transition-all duration-100"
                      style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg,#A855F7,#EC4899)' }} />
                  </div>
                </div>
                <input type="range" min="0" max={duration || 100}
                  value={isDragging ? dragTime : currentTime}
                  onChange={handleSeekChange} onMouseUp={handleSeekCommit} onTouchEnd={handleSeekCommit}
                  className="seek-thumb relative z-10 w-full h-full appearance-none cursor-pointer"
                  style={{ opacity: 0 }} aria-label="Seek audio position" />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-lg border-2 pointer-events-none transition-all duration-100"
                  style={{ left: `calc(${progressPct}% - 8px)`, background: 'linear-gradient(135deg,#A855F7,#EC4899)', borderColor: '#080C18', boxShadow: '0 0 10px rgba(168,85,247,0.6)' }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono mt-0.5 px-0.5"
                style={{ color: 'rgba(240,240,255,0.4)' }}>
                <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center gap-2 sm:gap-3 pb-3">
              {/* Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(168,85,247,0.3),rgba(236,72,153,0.3))', border: '1px solid rgba(168,85,247,0.3)' }}>
                  {story.cover_emoji || '📖'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isPlaying && <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ background: '#A855F7' }} />}
                    <p className="text-[11px] font-bold uppercase tracking-wider font-sans truncate" style={{ color: '#C084FC' }}>
                      EP {currentEpisode.episode_number} of {episodes.length}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-white truncate" style={{ fontFamily: 'var(--font-malayalam)' }}>
                    {currentEpisode.title_malayalam || `എപ്പിസോഡ് ${currentEpisode.episode_number}`}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <button onClick={cycleSpeed}
                  className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full font-bold font-sans text-xs min-h-[44px] min-w-[44px] transition hover:opacity-80"
                  style={{ color: 'rgba(240,240,255,0.6)', background: 'rgba(255,255,255,0.06)' }}
                  aria-label={`Playback speed: ${playbackSpeed}x`}>
                  {playbackSpeed}x
                </button>
                <button onClick={() => skipTime(-10)}
                  className="p-2 rounded-full flex flex-col items-center min-h-[44px] min-w-[44px] justify-center transition hover:opacity-80"
                  style={{ color: 'rgba(240,240,255,0.7)' }}
                  aria-label="Skip back 10 seconds">
                  <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[8px] font-bold leading-none">10s</span>
                </button>
                <button onClick={togglePlayPause}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all duration-150 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  style={{ background: 'linear-gradient(135deg,#A855F7,#EC4899)', boxShadow: '0 0 20px rgba(168,85,247,0.4)' }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="h-5 w-5 fill-white text-white" /> : <Play className="h-5 w-5 fill-white text-white ml-0.5" />}
                </button>
                <button onClick={() => skipTime(30)}
                  className="p-2 rounded-full flex flex-col items-center min-h-[44px] min-w-[44px] justify-center transition hover:opacity-80"
                  style={{ color: 'rgba(240,240,255,0.7)' }}
                  aria-label="Skip forward 30 seconds">
                  <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[8px] font-bold leading-none">30s</span>
                </button>
                <button onClick={playNextEpisode} disabled={currentIndex >= episodes.length - 1}
                  className="p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition disabled:opacity-30 disabled:pointer-events-none hover:opacity-80"
                  style={{ color: 'rgba(240,240,255,0.7)' }}
                  aria-label="Next episode">
                  <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                </button>
                <button onClick={cycleSpeed}
                  className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full font-bold font-sans text-[11px] min-h-[44px] min-w-[44px]"
                  style={{ color: 'rgba(240,240,255,0.6)', background: 'rgba(255,255,255,0.06)' }}>
                  {playbackSpeed}x
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Episode list component
interface EpisodeListProps {
  episodes: Episode[]
  currentEpisode: Episode | null
  isPlaying: boolean
  completedEpisodes: Set<string>
  onPlay: (ep: Episode) => void
  compact?: boolean
}

function EpisodeList({ episodes, currentEpisode, isPlaying, completedEpisodes, onPlay, compact = false }: EpisodeListProps) {
  if (episodes.length === 0) return (
    <div className="p-8 text-center">
      <p className="text-sm font-semibold" style={{ color: 'rgba(240,240,255,0.4)', fontFamily: 'var(--font-malayalam)' }}>
        ഓഡിയോ എപ്പിസോഡുകൾ ഒന്നും ലഭ്യമല്ല.
      </p>
      <p className="text-xs mt-1" style={{ color: 'rgba(240,240,255,0.3)' }}>
        Audio episodes are being synthesized. Check back soon!
      </p>
    </div>
  )

  return (
    <div className={compact ? 'divide-y' : 'space-y-2 p-4'} style={compact ? { borderColor: 'rgba(255,255,255,0.06)' } : {}}>
      {episodes.map((ep) => {
        const isSelected = currentEpisode?.id === ep.id
        const isCompleted = completedEpisodes.has(ep.id)
        const durationMins = ep.duration_seconds ? Math.max(1, Math.round(ep.duration_seconds / 60)) : 8

        if (compact) return (
          <button key={ep.id} onClick={() => onPlay(ep)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-400 ${isSelected ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors`}
              style={isSelected
                ? { background: 'linear-gradient(135deg,#A855F7,#EC4899)' }
                : { background: 'rgba(255,255,255,0.08)' }}>
              {isSelected && isPlaying
                ? <Pause className="h-3.5 w-3.5 fill-white text-white" />
                : <Play className="h-3.5 w-3.5 fill-current ml-0.5" style={{ color: isSelected ? 'white' : 'rgba(240,240,255,0.7)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#C084FC' }}>EP {ep.episode_number}</div>
              <p className={`text-sm truncate ${isSelected ? 'font-bold text-white' : 'text-white/70'}`}
                style={{ fontFamily: 'var(--font-malayalam)' }}>
                {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px]" style={{ color: 'rgba(240,240,255,0.4)' }}>{durationMins}m</span>
              {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />}
            </div>
          </button>
        )

        return (
          <button key={ep.id} onClick={() => onPlay(ep)}
            className={`w-full group flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#080C18]`}
            style={isSelected
              ? { background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', boxShadow: '0 0 20px rgba(168,85,247,0.1)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
              style={isSelected ? { background: 'linear-gradient(135deg,#A855F7,#EC4899)' } : { background: 'rgba(255,255,255,0.08)' }}>
              {isSelected && isPlaying
                ? <Pause className="h-4 w-4 fill-white text-white" />
                : <Play className="h-4 w-4 fill-current ml-0.5" style={{ color: isSelected ? 'white' : 'rgba(240,240,255,0.6)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: '#C084FC' }}>
                Episode {ep.episode_number}
              </span>
              <h3 className={`text-sm sm:text-base truncate mt-0.5 ${isSelected ? 'font-bold text-white' : 'text-white/80'}`}
                style={{ fontFamily: 'var(--font-malayalam)' }}>
                {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,240,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {durationMins} min
              </span>
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
            </div>
          </button>
        )
      })}
    </div>
  )
}
