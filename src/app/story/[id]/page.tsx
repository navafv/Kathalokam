'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
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
    Sparkles
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Props = {
    params: { id: string }
}

export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const id = params.id

    const { data: story } = await supabase
        .from('stories')
        .select('title_malayalam, title_english, description, genre')
        .eq('id', id)
        .single()

    if (!story) {
        return {
            title: 'കഥ കണ്ടെത്താനായില്ല (Story Not Found) — കഥാലോകം',
        }
    }

    const title = `${story.title_malayalam} — കഥാലോകം`
    const description = story.description || `Listen to ${story.title_english || story.title_malayalam}, a free Malayalam ${story.genre} audio story on Kathalokam.`

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: 'article',
            url: `https://kathalokam.vercel.app/story/${id}`,
            siteName: 'കഥാലോകം',
            images: [
                {
                    url: '/og-image.png', // Fallback to main brand card
                    width: 1200,
                    height: 630,
                    alt: story.title_malayalam,
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: ['/og-image.png'],
        },
    }
}

export default function StoryDetailPage({ params }: { params: { id: string } }) {
    const storyId = params.id
    // const supabase = createClient()

    // Data state
    const [story, setStory] = useState<Story | null>(null)
    const [episodes, setEpisodes] = useState<Episode[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Audio player state
    const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [shouldAutoPlay, setShouldAutoPlay] = useState(false)
    const [finishedAll, setFinishedAll] = useState(false)

    // DOM reference for HTML5 Audio
    const audioRef = useRef<HTMLAudioElement | null>(null)

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
                    .eq('status', 'audio_generated') // Only show episodes with valid audio
                    .order('episode_number', { ascending: true })

                if (epErr) throw new Error('എപ്പിസോഡുകൾ ലഭ്യമാക്കാൻ കഴിഞ്ഞില്ല.')

                setStory(storyData)
                setEpisodes(epData || [])

                // Set initial episode if available
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

    // 2. Handle Episode Switching & LocalStorage Resume
    useEffect(() => {
        if (!currentEpisode || !audioRef.current) return

        setFinishedAll(false)
        const audio = audioRef.current
        audio.src = currentEpisode.audio_url || ''
        audio.load()

        // Restore listening progress from localStorage
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

        // Autoplay if triggered by "Start Listening" button or auto-advance
        if (shouldAutoPlay) {
            audio.play().catch((e) => console.log('Autoplay prevented by browser:', e))
            setIsPlaying(true)
        } else {
            setIsPlaying(false)
        }
    }, [currentEpisode])

    // 3. Audio Event Handlers
    const handleTimeUpdate = () => {
        if (!audioRef.current || !currentEpisode) return
        const current = audioRef.current.currentTime
        setCurrentTime(current)

        // Save progress to localStorage every second
        if (Math.floor(current) % 2 === 0 && current > 0) {
            localStorage.setItem(`progress_${currentEpisode.id}`, Math.floor(current).toString())
        }
    }

    const handleLoadedMetadata = () => {
        if (!audioRef.current) return
        setDuration(audioRef.current.duration || currentEpisode?.duration_seconds || 0)
    }

    const handleEnded = () => {
        if (!currentEpisode) return

        // Clear progress for completed episode
        localStorage.removeItem(`progress_${currentEpisode.id}`)
        setIsPlaying(false)

        // Auto-advance to next episode
        const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id)
        if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
            setShouldAutoPlay(true)
            setCurrentEpisode(episodes[currentIndex + 1])
        } else {
            // Reached the end of the entire story
            setFinishedAll(true)
        }
    }

    // --- Controls ---

    const togglePlayPause = () => {
        if (!audioRef.current || !currentEpisode) return
        if (isPlaying) {
            audioRef.current.pause()
            setIsPlaying(false)
        } else {
            audioRef.current.play()
            setIsPlaying(true)
            setShouldAutoPlay(true)
        }
    }

    const skipTime = (seconds: number) => {
        if (!audioRef.current) return
        const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds))
        audioRef.current.currentTime = newTime
        setCurrentTime(newTime)
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioRef.current) return
        const seekTo = Number(e.target.value)
        audioRef.current.currentTime = seekTo
        setCurrentTime(seekTo)
    }

    const playNextEpisode = () => {
        if (!currentEpisode) return
        const currentIndex = episodes.findIndex((e) => e.id === currentEpisode.id)
        if (currentIndex !== -1 && currentIndex < episodes.length - 1) {
            setShouldAutoPlay(true)
            setCurrentEpisode(episodes[currentIndex + 1])
        }
    }

    // Time format helper (MM:SS)
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds <= 0) return '0:00'
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FDF6EC] flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-10 w-10 animate-spin text-[#1B4332]" />
                <span className="text-base font-semibold font-[family-name:var(--font-malayalam)] text-[#1B4332]">
                    കഥ ലോഡ് ചെയ്യുന്നു...
                </span>
            </div>
        )
    }

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
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B4332] text-[#FDF6EC] text-xs font-semibold rounded-lg hover:bg-[#1B4332]/90 transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>പ്രധാന പേജിലേക്ക് മടങ്ങുക</span>
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#FDF6EC] text-[#1B4332] font-serif pb-44 selection:bg-[#D4A017]/30">

            {/* Hidden HTML5 Audio Element */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                preload="metadata"
            />

            {/* Top Navigation Bar */}
            <header className="border-b border-[#1B4332]/10 bg-[#FDF6EC]/80 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans font-semibold text-[#1B4332]/80 hover:text-[#1B4332] transition"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span>എല്ലാ കഥകളും (All Stories)</span>
                    </Link>
                    <span className="text-lg font-bold font-[family-name:var(--font-malayalam)] tracking-tight">
                        കഥാലോകം
                    </span>
                </div>
            </header>

            {/* --- TOP SECTION: STORY HEADER --- */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-10 border-b border-[#1B4332]/15">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left">

                    {/* Large Emoji Cover in Colored Gradient Circle */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#1B4332]/15 via-[#D4A017]/20 to-[#1B4332]/10 border-2 border-[#1B4332]/20 flex items-center justify-center text-6xl sm:text-7xl shadow-inner flex-shrink-0">
                        <span>{story.cover_emoji || '📖'}</span>
                    </div>

                    <div className="flex-1 space-y-4">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 font-sans text-xs">
                            <span className="px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-[#1B4332] text-[#D4A017]">
                                {story.genre}
                            </span>
                            <span className="font-semibold text-[#1B4332]/80">
                                • {episodes.length} {episodes.length === 1 ? 'Episode' : 'Episodes'}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Free to listen
                            </span>
                        </div>

                        {/* Story Titles */}
                        <div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-[family-name:var(--font-malayalam)] leading-tight text-[#1B4332]">
                                {story.title_malayalam}
                            </h1>
                            {story.title_english && (
                                <p className="text-base sm:text-lg font-sans font-medium text-[#1B4332]/70 mt-1 italic">
                                    {story.title_english}
                                </p>
                            )}
                        </div>

                        {/* Description */}
                        <p className="text-sm sm:text-base font-sans text-[#1B4332]/85 leading-relaxed max-w-2xl">
                            {story.description || 'ഈ മനോഹരമായ മലയാളം ഓഡിയോ കഥ ആസ്വദിക്കൂ.'}
                        </p>

                        {/* Big Green Start Listening Button */}
                        <div className="pt-2">
                            <button
                                onClick={() => {
                                    if (episodes.length > 0) {
                                        setShouldAutoPlay(true)
                                        setCurrentEpisode(episodes[0])
                                        if (audioRef.current && currentEpisode?.id === episodes[0].id) {
                                            audioRef.current.play()
                                            setIsPlaying(true)
                                        }
                                    }
                                }}
                                disabled={episodes.length === 0}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#1B4332] hover:bg-[#1B4332]/90 text-[#FDF6EC] font-sans font-bold text-base rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 disabled:opacity-50"
                            >
                                <Play className="h-5 w-5 fill-current text-[#D4A017]" />
                                <span className="font-[family-name:var(--font-malayalam)] text-lg">
                                    കേട്ടു തുടങ്ങാം (Start Listening)
                                </span>
                            </button>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- EPISODES LIST SECTION --- */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
                <div className="flex items-center justify-between border-b border-[#1B4332]/15 pb-4">
                    <h2 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-malayalam)] flex items-center gap-2">
                        <Headphones className="h-6 w-6 text-[#1B4332]" />
                        <span>എപ്പിസോഡുകൾ ({episodes.length})</span>
                    </h2>
                    <span className="text-xs font-sans font-semibold text-[#1B4332]/60">
                        Tappable audio tracks
                    </span>
                </div>

                {episodes.length === 0 ? (
                    <div className="p-12 text-center bg-white/60 rounded-2xl border border-[#1B4332]/10 space-y-2 font-sans">
                        <p className="text-sm font-semibold text-[#1B4332]/70">ഓഡിയോ എപ്പിസോഡുകൾ ഒന്നും ലഭ്യമല്ല.</p>
                        <p className="text-xs text-[#1B4332]/50">The audio for this story is currently being synthesized. Please check back later.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {episodes.map((ep) => {
                            const isSelected = currentEpisode?.id === ep.id
                            const durationMins = ep.duration_seconds ? Math.max(1, Math.round(ep.duration_seconds / 60)) : 8

                            return (
                                <div
                                    key={ep.id}
                                    onClick={() => {
                                        setShouldAutoPlay(true)
                                        setCurrentEpisode(ep)
                                        if (audioRef.current && isSelected) {
                                            togglePlayPause()
                                        }
                                    }}
                                    className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-4 font-sans ${isSelected
                                        ? 'border-l-8 border-l-[#1B4332] border-y-[#1B4332]/30 border-r-[#1B4332]/30 bg-[#1B4332]/10 shadow-md'
                                        : 'border-[#1B4332]/15 bg-white/80 hover:bg-white hover:border-[#1B4332]/40 shadow-sm'
                                        }`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        {/* Play/Pause Icon indicator */}
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isSelected
                                            ? 'bg-[#1B4332] text-[#D4A017]'
                                            : 'bg-[#1B4332]/10 text-[#1B4332] group-hover:bg-[#1B4332] group-hover:text-[#FDF6EC]'
                                            }`}>
                                            {isSelected && isPlaying ? (
                                                <Pause className="h-5 w-5 fill-current" />
                                            ) : (
                                                <Play className="h-5 w-5 fill-current ml-0.5" />
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A017] block">
                                                Episode {ep.episode_number}
                                            </span>
                                            <h3 className="text-base sm:text-lg font-bold font-[family-name:var(--font-malayalam)] text-[#1B4332] truncate mt-0.5">
                                                {ep.title_malayalam || `എപ്പിസോഡ് ${ep.episode_number}`}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-xs font-semibold text-[#1B4332]/70 bg-[#1B4332]/5 px-3 py-1 rounded-full border border-[#1B4332]/10">
                                            {durationMins} min
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Finished All Episodes Banner */}
                {finishedAll && (
                    <div className="mt-8 p-6 bg-gradient-to-r from-[#1B4332] to-[#1B4332]/90 text-[#FDF6EC] rounded-2xl shadow-lg text-center space-y-2 animate-in fade-in zoom-in-95 duration-300 border border-[#D4A017]/30">
                        <Sparkles className="h-8 w-8 text-[#D4A017] mx-auto animate-bounce" />
                        <h3 className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-malayalam)] text-[#D4A017]">
                            ഇനിയില്ല — പുതിയ episodes വരുന്നു!
                        </h3>
                        <p className="text-xs sm:text-sm font-sans text-[#FDF6EC]/80 max-w-md mx-auto">
                            You have finished listening to all published episodes of "{story.title_malayalam}". Stay tuned for more stories on Kathalokam!
                        </p>
                    </div>
                )}
            </section>

            {/* --- STICKY BOTTOM AUDIO PLAYER --- */}
            {currentEpisode && (
                <div className="fixed bottom-0 inset-x-0 z-50 bg-[#1B4332] text-[#FDF6EC] border-t-2 border-[#D4A017]/40 shadow-2xl px-4 sm:px-8 py-3 sm:py-4 transition-all duration-300">
                    <div className="max-w-4xl mx-auto flex flex-col gap-2">

                        {/* Top Row: Malayalam Title & Time Info */}
                        <div className="flex items-center justify-between text-xs sm:text-sm font-sans">
                            <div className="min-w-0 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#D4A017] animate-pulse flex-shrink-0" />
                                <span className="font-[family-name:var(--font-malayalam)] font-bold text-[#FDF6EC] truncate text-sm sm:text-base">
                                    {currentEpisode.title_malayalam || `എപ്പിസോഡ് ${currentEpisode.episode_number}`}
                                </span>
                            </div>
                            <span className="text-[#FDF6EC]/80 font-mono text-xs flex-shrink-0 ml-2">
                                {formatTime(currentTime)} / {formatTime(duration)}
                            </span>
                        </div>

                        {/* Middle Row: Seek Bar */}
                        <div className="w-full flex items-center gap-2">
                            <input
                                type="range"
                                min="0"
                                max={duration || 100}
                                value={currentTime}
                                onChange={handleSeek}
                                className="w-full h-1.5 bg-[#FDF6EC]/20 rounded-lg appearance-none cursor-pointer accent-[#D4A017] focus:outline-none"
                            />
                        </div>

                        {/* Bottom Row: Controls (Skip -10s | Play/Pause | Skip +30s | Next) */}
                        <div className="flex items-center justify-between pt-1 font-sans">

                            <div className="text-xs font-semibold text-[#D4A017] hidden sm:block">
                                EP {currentEpisode.episode_number} OF {episodes.length}
                            </div>

                            <div className="flex items-center justify-center gap-4 sm:gap-6 w-full sm:w-auto">
                                {/* Skip Back 10s */}
                                <button
                                    onClick={() => skipTime(-10)}
                                    aria-label="Skip back 10 seconds"
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/80 hover:text-[#FDF6EC] transition flex flex-col items-center"
                                >
                                    <RotateCcw className="h-5 w-5" />
                                    <span className="text-[9px] -mt-0.5 font-bold">-10s</span>
                                </button>

                                {/* Big Center Play/Pause Button */}
                                <button
                                    onClick={togglePlayPause}
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#D4A017] hover:bg-[#D4A017]/90 text-[#1B4332] flex items-center justify-center shadow-lg transform active:scale-95 transition-all duration-150"
                                >
                                    {isPlaying ? (
                                        <Pause className="h-6 w-6 sm:h-7 sm:w-7 fill-current" />
                                    ) : (
                                        <Play className="h-6 w-6 sm:h-7 sm:w-7 fill-current ml-0.5" />
                                    )}
                                </button>

                                {/* Skip Forward 30s */}
                                <button
                                    onClick={() => skipTime(30)}
                                    aria-label="Skip forward 30 seconds"
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/80 hover:text-[#FDF6EC] transition flex flex-col items-center"
                                >
                                    <RotateCw className="h-5 w-5" />
                                    <span className="text-[9px] -mt-0.5 font-bold">+30s</span>
                                </button>

                                {/* Next Episode Button */}
                                <button
                                    onClick={playNextEpisode}
                                    disabled={episodes.findIndex((e) => e.id === currentEpisode.id) >= episodes.length - 1}
                                    aria-label="Next Episode"
                                    className="p-2 hover:bg-[#FDF6EC]/10 rounded-full text-[#FDF6EC]/80 hover:text-[#FDF6EC] transition disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 text-xs font-semibold ml-2 sm:ml-4"
                                >
                                    <SkipForward className="h-5 w-5 fill-current" />
                                    <span className="hidden sm:inline">Next</span>
                                </button>
                            </div>

                            <div className="w-24 hidden sm:block text-right">
                                <span className="text-[10px] uppercase font-bold tracking-widest text-[#FDF6EC]/60">
                                    Audio App
                                </span>
                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    )
}