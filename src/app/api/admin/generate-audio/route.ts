import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { story_id } = await request.json()

        if (!story_id) {
            return NextResponse.json({ success: false, error: 'story_id is required' }, { status: 400 })
        }

        const apiKey = process.env.GOOGLE_TTS_API_KEY
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'GOOGLE_TTS_API_KEY is missing' }, { status: 500 })
        }

        // 1. Fetch all approved episodes for the story
        const { data: episodes, error: fetchError } = await supabaseAdmin
            .from('episodes')
            .select('*')
            .eq('story_id', story_id)
            .eq('status', 'approved')
            .order('episode_number', { ascending: true })

        if (fetchError || !episodes || episodes.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No approved episodes found for audio generation.' },
                { status: 404 }
            )
        }

        let processedCount = 0
        let failedCount = 0
        const errors: Array<{ episode_number: number; error: string }> = []

        // 2. Process each episode sequentially
        for (const ep of episodes) {
            try {
                if (!ep.script_text || ep.script_text.trim() === '') {
                    throw new Error('Script text is empty.')
                }

                // Call Google Cloud Text-to-Speech REST API
                const ttsResponse = await fetch(
                    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            input: { text: ep.script_text },
                            voice: {
                                languageCode: 'ml-IN',
                                name: 'ml-IN-Wavenet-A', // Premium Malayalam voice
                            },
                            audioConfig: {
                                audioEncoding: 'MP3',
                                speakingRate: 0.9, // Slightly slower for clear storytelling
                                pitch: 0,
                            },
                        }),
                    }
                )

                const ttsData = await ttsResponse.json()

                if (!ttsResponse.ok || !ttsData.audioContent) {
                    throw new Error(ttsData.error?.message || 'Google TTS API synthesis failed.')
                }

                // Convert base64 audio response to Uint8Array Buffer
                const audioBuffer = Buffer.from(ttsData.audioContent, 'base64')

                // 3. Upload MP3 to Supabase Storage
                const filePath = `stories/${story_id}/episode-${ep.episode_number}.mp3`

                const { error: uploadError } = await supabaseAdmin.storage
                    .from('audio-stories')
                    .upload(filePath, audioBuffer, {
                        contentType: 'audio/mpeg',
                        upsert: true,
                    })

                if (uploadError) {
                    throw new Error(`Storage upload failed: ${uploadError.message}`)
                }

                // Get Public URL
                const { data: { publicUrl } } = supabaseAdmin.storage
                    .from('audio-stories')
                    .getPublicUrl(filePath)

                // 4. Calculate word count & duration (word_count / 2)
                const wordCount = ep.script_text.trim().split(/\s+/).filter(Boolean).length
                const durationSeconds = Math.max(10, Math.ceil(wordCount / 2))

                // Update Episode in Supabase
                const { error: updateError } = await supabaseAdmin
                    .from('episodes')
                    .update({
                        audio_url: publicUrl,
                        duration_seconds: durationSeconds,
                        status: 'audio_generated',
                    })
                    .eq('id', ep.id)

                if (updateError) {
                    throw new Error(`Database update failed: ${updateError.message}`)
                }

                processedCount++
            } catch (err: any) {
                console.error(`Failed episode ${ep.episode_number}:`, err)
                failedCount++
                errors.push({
                    episode_number: ep.episode_number,
                    error: err.message || 'Unknown synthesis error',
                })
            }
        }

        // 5. If at least one episode processed and none failed, publish the story
        if (processedCount > 0 && failedCount === 0) {
            await supabaseAdmin
                .from('stories')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', story_id)
        }

        // 6. Log admin action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_audio',
            story_id: story_id,
            notes: `Audio generated: ${processedCount} succeeded, ${failedCount} failed.`,
        })

        return NextResponse.json({
            success: true,
            episodes_processed: processedCount,
            episodes_failed: failedCount,
            errors: errors,
        })
    } catch (error: any) {
        console.error('Audio Generation Fatal Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Server error during audio generation.' },
            { status: 500 }
        )
    }
}