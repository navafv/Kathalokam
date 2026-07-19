'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
    Play,
    Pause,
    RotateCcw,
    RotateCw,
    SkipForward,
    ArrowLeft,
    Loader2,
    AlertCircle,
    Headphones,
    CheckCircle2,
    Share2,
    Sparkles,
    ListMusic,
    X,
    ChevronDown,
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

const COVER_GRADIENTS = [
    'from-emerald-900 via-emerald-800 to-[#1B4332]',
    'from-[#1B4332] via-amber-900 to-emerald-900',
    'from-amber-900 via-[#1B4332] to-emerald-800',
    'from-emerald-800 via-emerald-900 to-amber-900',
]

function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds <= 0) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

function getEpisodeGradient(index: number): string {
    return COVER_GRADIENTS[index % COVER_GRADIENTS.length]
}

export default function StoryClientPage({ storyId }: { storyId: string }) {
    const supabase = createClient()

    // Data state
    const [story, setStory] = useState<Story | null>(null)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Player state
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

    // UI state
    const [showEpisodeSheet, setShowEpisodeSheet] = useState(false)

    const audioRef = useRef<HTMLAudioElement | null>(null)
    const seekBarRef = useRef<HTMLInputElement | null>(null)

    // Load completed episodes from localStorage
    useEffect(() => {
        const completed = new Set<string>()
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('completed_')) {
                completed.add(key.replace('completed_', ''))
            }
        }
        setCompletedEpisodes(completed)
    }, [])

    // 1. Fetch Story and Episodes
    useEffect(() => {
        const fetchStoryAndEpisodes = async () => {
            try {
                setLoading(true)
                const { data: storyData, error: storyErr } = await supabase
                    .from('stories')
                    .select('*')
                    .eq('id', storyId)
                    .single()

                if (storyErr || !storyData) throw new Error('കഥ കണ്ടെത്താനായില്ല (Story not found).')

                const { data: epData, error: epErr } = await supabase
                    .from('episodes')
                    .select('*')
                    .eq('story_id', storyId)
                    .eq('status', 'audio_generated')
                    .order('episode_number', { ascending: true })

                if (epErr) throw new Error('എപ്പിസോഡുകൾ ലഭ്യമാക്കാൻ കഴിഞ്ഞില്ല.')

                setStory(storyData)
                setEpisodes(epData || [])
                if (epData && epData.length > 0) {
                    setCurrentEpisode(epData[0])
                }
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred.')
            } finally {
                setLoading(false)
            }
        }
        fetchStoryAndEpisodes()
    }, [storyId])

    // 2. Handle Episode Switching
    useEffect(() => {
        if (!currentEpisode || !audioRef.current) return

        setFinishedAll(false)
        const audio = audioRef.current
        audio.src = currentEpisode.audio_url || ''
        audio.playbackRate = playbackSpeed
        audio.load()

        const savedProgress = localStorage.getItem(`progress_${currentEpisode.id}`)
        if (savedProgress) {
            const parsedTime = Number(savedProgress)
            if (!isNaN(parsedTime) && parsedTime > 0) {
                audio.currentTime = parsedTime
                setCurrentTime(parsedTime)
            }
        } else {
            audio.currentTime = 0
            setCurrentTime(0)
        }

        if (shouldAutoPlay) {
            audio.play().catch(() => { })
            setIsPlaying(true)
        } else {
            setIsPlaying(false)
        }
    }, [currentEpisode])

    // 3. Apply playback speed
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed
        }
    }, [playbackSpeed])

    // Audio event handlers
    const handleTimeUpdate = useCallback(() => {
        if (!audioRef.current || !currentEpisode || isDragging) return
        const current = audioRef.current.currentTime
        setCurrentTime(current)

        if (Math.floor(current) % 3 === 0 && current > 0) {
            localStorage.setItem(`progress_${currentEpisode.id}`, Math.floor(current).toString())
        }
    }, [currentEpisode, isDragging])

    const handleLoadedMetadata = useCallback(() => {
        if (!audioRef.current) return
        const dur = audioRef.current.duration || currentEpisode?.duration_seconds || 0
        setDuration(dur)
    }, [currentEpisode])

    const handleEnded = useCallback(() => {
        if (!currentEpisode) return

        localStorage.removeItem(`progress_${currentEpisode.id}`)
        localStorage.setItem(`completed_${currentEpisode.id}`, '1')
        setCompletedEpisodes(prev => new Set([...prev, currentEpisode.id]))
        setIsPlaying(false)

        const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id)
        if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
            setShouldAutoPlay(true)
            setCurrentEpisode(episodes[currentIndex + 1])
        } else {
            setFinishedAll(true)
        }
    }, [currentEpisode, episodes])

    const togglePlayPause = useCallback(() => {
        if (!audioRef.current || !currentEpisode) return
        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play().catch(() => { })
            setIsPlaying(true)
            setShouldAutoPlay(true)
        }
    }, [isPlaying, currentEpisode])

    const skipTime = useCallback((seconds: number) => {
        if (!audioRef.current) return
        const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
    }, [duration])

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value)
        setDragTime(val)
        setIsDragging(true)
    }

    const handleSeekCommit = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
        if (!audioRef.current) return
        audioRef.current.currentTime = dragTime
        setCurrentTime(dragTime)
        setIsDragging(false)
    }

    const playEpisode = useCallback((ep: Episode) => {
        setShouldAutoPlay(true)
        setCurrentEpisode(ep)
        if (audioRef.current && currentEpisode?.id === ep.id) {
            togglePlayPause()
        }
        setShowEpisodeSheet(false)
    }, [currentEpisode, togglePlayPause])

    const playNextEpisode = useCallback(() => {
        if (!currentEpisode) return
        const idx = episodes.findIndex((e) => e.id === currentEpisode.id)
        if (idx !== -1 && idx < episodes.length - 1) {
            setShouldAutoPlay(true)
            setCurrentEpisode(episodes[idx + 1])
        }
    }, [currentEpisode, episodes])

    const cycleSpeed = useCallback(() => {
        setPlaybackSpeed(prev => {
            const idx = PLAYBACK_SPEEDS.indexOf(prev)
            return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length]
        })
    }, [])

    const handleShare = useCallback(() => {
        if (navigator.share && story) {
            navigator.share({
                title: story.title_malayalam,
                text: `Listen to "${story.title_malayalam}" on Kathalokam!`,
                url: window.location.href,
            }).catch(() => { })
        } else {
            navigator.clipboard?.writeText(window.location.href)
        }
    }, [story])

    const currentIndex = currentEpisode ? episodes.findIndex(e => e.id === currentEpisode.id) : -1
    const progressPct = duration > 0 ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0

    // ── Loading ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF6EC] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#1B4332] flex items-center justify-center animate-pulse">
                    <Headphones className="h-8 w-8 text-[#D4A017]" />
                </div>
                <div className="space-y-1 text-center">
                    <div className="flex items-center gap-2 justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1B4332]" />
                        <span className="text-sm font-semibold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
                            കഥ ലോഡ് ചെയ്യുന്നു...
                        </span>
                    </div>
                    <p className="text-xs text-[#1B4332]/50 font-sans">Loading story...</p>
                </div>
            </div>
        )
    }

    // ── Error ────────────────────────────────────────────────────────────
    if (error || !story) {
        return (
            <div className="min-h-screen bg-[#FDF6EC] p-6 flex items-center justify-center">
                <div className="max-w-md w-full p-8 bg-white rounded-2xl border border-red-200 text-center shadow-sm space-y-4">
                    <AlertCircle className="h-10 w-10 text-red-600 mx-auto" />
                    <h3 className="text-lg font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
                        കഥ ലഭ്യമാക്കുന്നതിൽ പിശക്
                    </h3>
                    <p className="text-xs text-red-600 font-sans">{error}</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#1B4332] text-[#FDF6EC] text-sm font-semibold rounded-lg hover:bg-[#1B4332]/90 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>പ്രധാന പേജിലേക്ക് മടങ്ങുക</span>
                    </Link>
                </div>
            </div>
        )
    }

    // ── Main Layout ──────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#FDF6EC] text-[#1B4332] font-serif pb-36 selection:bg-[#D4A017]/30">
            <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeSlideUp 0.4s ease-out forwards; }
        @keyframes celebration {
          0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .celebrate { animation: celebration 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .seek-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #D4A017;
          cursor: pointer;
          border: 2px solid #FDF6EC;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .seek-thumb::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #D4A017;
          cursor: pointer;
          border: 2px solid #FDF6EC;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        .seek-thumb::-webkit-slider-track {
          height: 4px;
          border-radius: 2px;
        }
        .sheet-overlay { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sheet-panel { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="metadata"
            />

            {/* ─── HEADER ─────────────────────────────────────────────────── */}
            <header className="border-b border-[#1B4332]/10 bg-[#FDF6EC]/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-sm font-sans font-semibold text-[#1B4332]/75 hover:text-[#1B4332] transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] rounded-lg px-2 -ml-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="hidden sm:inline font-[family-name:var(--font-malayalam)]">
                            എല്ലാ കഥകളും
                        </span>
                        <span className="sm:hidden">Back</span>
                    </Link>
                    <span className="text-lg font-bold font-[family-name:var(--font-malayalam)] tracking-tight">
                        കഥാലോകം
                    </span>
                    {/* Episode list toggle — mobile */}
                    <button
                        onClick={() => setShowEpisodeSheet(true)}
                        className="flex items-center gap-1.5 text-xs font-sans font-semibold text-[#1B4332]/70 hover:text-[#1B4332] transition min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332] rounded-lg lg:hidden"
                        aria-label="Show episodes"
                    >
                        <ListMusic className="h-5 w-5" />
                        <span className="hidden sm:inline">Episodes</span>
                    </button>
                    <div className="hidden lg:block w-24" />
                </div>
            </header>

            {/* ─── DESKTOP LAYOUT: sidebar + main ─────────────────────────── */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-4 lg:flex lg:gap-8">

                {/* Main content column */}
                <div className="flex-1 min-w-0">

                    {/* Story header */}
                    <section className="pb-8 border-b border-[#1B4332]/12 fade-up">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
                            {/* Cover art */}
                            <div
                                className={`w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-gradient-to-br ${getEpisodeGradient(0)} flex items-center justify-center text-6xl sm:text-7xl shadow-xl flex-shrink-0`}
                            >
                                <span>{story.cover_emoji || '📖'}</span>
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-sans text-xs">
                                    <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-[#1B4332] text-[#D4A017]">
                                        {story.genre}
                                    </span>
                                    <span className="font-semibold text-[#1B4332]/70">
                                        {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        Free
                                    </span>
                                </div>

                                <div>
                                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-[family-name:var(--font-malayalam)] leading-tight text-[#1B4332]">
                                        {story.title_malayalam}
                                    </h1>
                                    {story.title_english && (
                                        <p className="text-sm font-sans font-medium text-[#1B4332]/60 mt-1 italic">
                                            {story.title_english}
                                        </p>
                                    )}
                                </div>

                                {story.description && (
                                    <p className="text-sm font-sans text-[#1B4332]/80 leading-relaxed max-w-xl hidden sm:block">
                                        {story.description}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3 justify-center sm:justify-start pt-1">
                                    <button
                                        onClick={() => {
                                            if (episodes.length > 0) {
                                                setShouldAutoPlay(true)
                                                if (currentEpisode?.id === episodes[0].id && audioRef.current) {
                                                    togglePlayPause()
                                                } else {
                                                    setCurrentEpisode(episodes[0])
                                                }
                                            }
                                        }}
                                        disabled={episodes.length === 0}
                                        className="inline-flex items-center gap-2.5 px-6 py-3 bg-[#1B4332] hover:bg-[#1B4332]/90 text-[#FDF6EC] font-sans font-bold text-sm rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 disabled:opacity-50 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2"
                                    >
                                        <Play className="h-4 w-4 fill-[#D4A017] text-[#D4A017]" />
                                        <span className="font-[family-name:var(--font-malayalam)]">
                                            {isPlaying ? 'കേൾക്കുന്നു...' : 'കേട്ടു തുടങ്ങാം'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={handleShare}
                                        className="inline-flex items-center gap-2 px-4 py-3 border border-[#1B4332]/25 text-[#1B4332] font-sans font-semibold text-sm rounded-full hover:bg-[#1B4332]/5 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
                                    >
                                        <Share2 className="h-4 w-4" />
                                        <span>Share</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Mobile episode list (below story header, hidden on lg) */}
                    <section className="py-6 space-y-3 lg:hidden">
                        <h2 className="text-lg font-bold font-[family-name:var(--font-malayalam)] flex items-center gap-2">
                            <Headphones className="h-5 w-5" />
                            <span>എപ്പിസോഡുകൾ ({episodes.length})</span>
                        </h2>
                        <EpisodeList
                            episodes={episodes}
                            currentEpisode={currentEpisode}
                            isPlaying={isPlaying}
                            completedEpisodes={completedEpisodes}
                            onPlay={playEpisode}
                        />
                    </section>

                    {/* Finished all — celebration */}
                    {finishedAll && (
                        <div className="mt-6 p-6 bg-gradient-to-br from-[#1B4332] to-emerald-800 text-[#FDF6EC] rounded-2xl shadow-xl text-center space-y-3 border border-[#D4A017]/30 celebrate">
                            <Sparkles className="h-10 w-10 text-[#D4A017] mx-auto animate-bounce" />
                            <h3 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-malayalam)] text-[#D4A017]">
                                🎉 എല്ലാ എപ്പിസോഡുകളും കഴിഞ്ഞു!
                            </h3>
                            <p className="text-sm font-sans text-[#FDF6EC]/80 max-w-md mx-auto">
                                You've finished all episodes of "{story.title_malayalam}". Thank you for listening!
                            </p>
                            <div className="flex flex-wrap gap-3 justify-center pt-2">
                                <button
                                    onClick={handleShare}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#D4A017] text-[#1B4332] font-bold text-sm rounded-full hover:bg-[#D4A017]/90 transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
                                >
                                    <Share2 className="h-4 w-4" />
                                    <span className="font-[family-name:var(--font-malayalam)]">കഥ ഷെയർ ചെയ്യൂ</span>
                                </button>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-[#FDF6EC] font-semibold text-sm rounded-full transition min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <span className="font-[family-name:var(--font-malayalam)]">കഥകളിലേക്ക് മടങ്ങുക</span>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── DESKTOP SIDEBAR: Episode list ──────────────────────── */}
                <aside className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0">
                    <div className="sticky top-20 bg-white/70 backdrop-blur-sm rounded-2xl border border-[#1B4332]/12 overflow-hidden shadow-sm">
                        <div className="px-4 py-3 border-b border-[#1B4332]/10 flex items-center justify-between">
                            <h2 className="font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332] flex items-center gap-2">
                                <Headphones className="h-4 w-4" />
                                എപ്പിസോഡുകൾ ({episodes.length})
                            </h2>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
                            <EpisodeList
                                episodes={episodes}
                                currentEpisode={currentEpisode}
                                isPlaying={isPlaying}
                                completedEpisodes={completedEpisodes}
                                onPlay={playEpisode}
                                compact
                            />
                        </div>
                    </div>
                </aside>
            </div>

            {/* ─── MOBILE BOTTOM SHEET ────────────────────────────────────── */}
            {showEpisodeSheet && (
                <>
                    <div
                        className="fixed inset-0 bg-black/40 z-40 sheet-overlay lg:hidden"
                        onClick={() => setShowEpisodeSheet(false)}
                    />
                    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#FDF6EC] rounded-t-2xl shadow-2xl sheet-panel lg:hidden max-h-[80vh] flex flex-col">
                        <div className="px-4 py-4 border-b border-[#1B4332]/10 flex items-center justify-between flex-shrink-0">
                            <h2 className="font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
                                എപ്പിസോഡുകൾ ({episodes.length})
                            </h2>
                            <button
                                onClick={() => setShowEpisodeSheet(false)}
                                className="w-8 h-8 rounded-full bg-[#1B4332]/10 flex items-center justify-center hover:bg-[#1B4332]/20 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4332]"
                                aria-label="Close episode list"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 pb-4">
                            <EpisodeList
                                episodes={episodes}
                                currentEpisode={currentEpisode}
                                isPlaying={isPlaying}
                                completedEpisodes={completedEpisodes}
                                onPlay={playEpisode}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* ─── STICKY BOTTOM PLAYER (Spotify-style) ───────────────────── */}
            {currentEpisode && (
                <div className="fixed bottom-0 inset-x-0 z-50 bg-[#1B4332] text-[#FDF6EC] border-t-2 border-[#D4A017]/30 shadow-2xl">
                    <div className="max-w-5xl mx-auto px-3 sm:px-6">

                        {/* Waveform seek bar */}
                        <div className="relative pt-3 pb-1">
                            <div className="relative h-5 flex items-center">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full h-1 bg-[#FDF6EC]/15 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[#D4A017] rounded-full transition-all duration-100"
                                            style={{ width: `${progressPct}%` }}
                                        />
                                    </div>
                                </div>
                                <input
                                    ref={seekBarRef}
                                    type="range"
                                    min="0"
                                    max={duration || 100}
                                    value={isDragging ? dragTime : currentTime}
                                    onChange={handleSeekChange}
                                    onMouseUp={handleSeekCommit}
                                    onTouchEnd={handleSeekCommit}
                                    className="seek-thumb relative z-10 w-full h-full opacity-0 cursor-pointer appearance-none"
                                    aria-label="Seek audio position"
                                    style={{ opacity: 0 }}
                                />
                                {/* Draggable thumb */}
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#D4A017] shadow-md border-2 border-[#FDF6EC] pointer-events-none transition-all duration-100"
                                    style={{ left: `calc(${progressPct}% - 8px)` }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-[#FDF6EC]/50 mt-0.5 px-0.5">
                                <span>{formatTime(isDragging ? dragTime : currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Player controls row */}
                        <div className="flex items-center gap-2 sm:gap-3 pb-3">
                            {/* Episode artwork + info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getEpisodeGradient(currentIndex)} flex items-center justify-center text-lg flex-shrink-0 shadow-md`}>
                                    {story.cover_emoji || '📖'}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {isPlaying && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#D4A017] animate-pulse flex-shrink-0" />
                                        )}
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] font-sans truncate">
                                            EP {currentEpisode.episode_number} of {episodes.length}
                                        </p>
                                    </div>
                                    <p className="text-xs sm:text-sm font-[family-name:var(--font-malayalam)] font-bold text-[#FDF6EC] truncate">
                                        {currentEpisode.title_malayalam || `എപ്പിസോഡ് ${currentEpisode.episode_number}`}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                {/* Speed cycling button */}
                                <button
                                    onClick={cycleSpeed}
                                    className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#FDF6EC]/10 transition text-[#FDF6EC]/75 hover:text-[#FDF6EC] font-bold font-sans text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] min-h-[44px] min-w-[44px]"
                                    aria-label={`Playback speed: ${playbackSpeed}x`}
                                >
                                    {playbackSpeed}x
                                </button>

                                {/* Skip back */}
                                <button
                                    onClick={() => skipTime(-10)}
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/75 hover:text-[#FDF6EC] transition flex flex-col items-center min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
                                    aria-label="Skip back 10 seconds"
                                >
                                    <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span className="text-[8px] font-bold leading-none">10s</span>
                                </button>

                                {/* Play/Pause — primary */}
                                <button
                                    onClick={togglePlayPause}
                                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#1B4332] flex items-center justify-center shadow-lg active:scale-95 transition-all duration-150 min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FDF6EC]"
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying ? (
                                        <Pause className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
                                    ) : (
                                        <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-current ml-0.5" />
                                    )}
                                </button>

                                {/* Skip forward */}
                                <button
                                    onClick={() => skipTime(30)}
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/75 hover:text-[#FDF6EC] transition flex flex-col items-center min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
                                    aria-label="Skip forward 30 seconds"
                                >
                                    <RotateCw className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span className="text-[8px] font-bold leading-none">30s</span>
                                </button>

                                {/* Next episode */}
                                <button
                                    onClick={playNextEpisode}
                                    disabled={currentIndex >= episodes.length - 1}
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/75 hover:text-[#FDF6EC] transition disabled:opacity-30 disabled:pointer-events-none min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017]"
                                    aria-label="Next episode"
                                >
                                    <SkipForward className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
                                </button>

                                {/* Speed — mobile compact */}
                                <button
                                    onClick={cycleSpeed}
                                    className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#FDF6EC]/10 transition text-[#FDF6EC]/75 hover:text-[#FDF6EC] font-bold font-sans text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] min-h-[44px] min-w-[44px]"
                                    aria-label={`Speed: ${playbackSpeed}x`}
                                >
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

// ── Episode List Component ───────────────────────────────────────────────
interface EpisodeListProps {
    episodes: Episode[]
    currentEpisode: Episode | null
    isPlaying: boolean
    completedEpisodes: Set<string>
    onPlay: (ep: Episode) => void
    compact?: boolean
}

function EpisodeList({
    episodes,
    currentEpisode,
    isPlaying,
    completedEpisodes,
    onPlay,
    compact = false,
}: EpisodeListProps) {
    if (episodes.length === 0) {
        return (
            <div className="p-8 text-center font-sans">
                <p className="text-sm font-semibold text-[#1B4332]/60 font-[family-name:var(--font-malayalam)]">
                    ഓഡിയോ എപ്പിസോഡുകൾ ഒന്നും ലഭ്യമല്ല.
                </p>
                <p className="text-xs text-[#1B4332]/45 mt-1">
                    Audio episodes are being synthesized. Check back soon!
                </p>
            </div>
        )
    }

    return (
        <div className={compact ? 'divide-y divide-[#1B4332]/8' : 'space-y-2 p-4'}>
            {episodes.map((ep, idx) => {
                const isSelected = currentEpisode?.id === ep.id
                const isCompleted = completedEpisodes.has(ep.id)
                const durationMins = ep.duration_seconds
                    ? Math.max(1, Math.round(ep.duration_seconds / 60))
                    : 8

                if (compact) {
                    return (
                        <button
                            key={ep.id}
                            onClick={() => onPlay(ep)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4A017]
                ${isSelected
                                    ? 'bg-[#1B4332]/8'
                                    : 'hover:bg-[#1B4332]/5'
                                }`}
                        >
                            {/* Play / pause indicator */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                ${isSelected
                                    ? 'bg-[#1B4332] text-[#D4A017]'
                                    : 'bg-[#1B4332]/10 text-[#1B4332]'
                                }`}
                            >
                                {isSelected && isPlaying ? (
                                    <Pause className="h-3.5 w-3.5 fill-current" />
                                ) : (
                                    <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4A017] font-sans">
                                    EP {ep.episode_number}
                                </div>
                                <p className={`text-sm font-[family-name:var(--font-malayalam)] truncate ${isSelected ? 'font-bold text-[#1B4332]' : 'text-[#1B4332]/85'}`}>
                                    {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-[10px] font-sans text-[#1B4332]/50">{durationMins}m</span>
                                {isCompleted && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    )
                }

                return (
                    <button
                        key={ep.id}
                        onClick={() => onPlay(ep)}
                        className={`w-full group flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2
              ${isSelected
                                ? 'border-l-4 border-l-[#1B4332] border-[#1B4332]/20 bg-[#1B4332]/8 shadow-sm'
                                : 'border-[#1B4332]/12 bg-white/70 hover:bg-white hover:border-[#1B4332]/30 shadow-sm'
                            }`}
                    >
                        {/* Play button */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
              ${isSelected
                                ? 'bg-[#1B4332] text-[#D4A017]'
                                : 'bg-[#1B4332]/10 text-[#1B4332] group-hover:bg-[#1B4332] group-hover:text-[#FDF6EC]'
                            }`}
                        >
                            {isSelected && isPlaying ? (
                                <Pause className="h-4 w-4 fill-current" />
                            ) : (
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] font-sans block">
                                Episode {ep.episode_number}
                            </span>
                            <h3 className={`text-sm sm:text-base font-[family-name:var(--font-malayalam)] truncate mt-0.5 ${isSelected ? 'font-bold text-[#1B4332]' : 'font-semibold text-[#1B4332]/90'}`}>
                                {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
                            </h3>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs font-semibold text-[#1B4332]/60 bg-[#1B4332]/5 px-2.5 py-1 rounded-full border border-[#1B4332]/10 font-sans">
                                {durationMins} min
                            </span>
                            {isCompleted && (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                            )}
                        </div>
                    </button>
                )
            })}
        </div>
    )
}