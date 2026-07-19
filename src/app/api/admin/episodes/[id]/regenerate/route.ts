import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function extractCleanJson(rawText: string): any {
    let cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/\s*```$/im, '')
        .trim()

    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
    }

    return JSON.parse(cleaned)
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const episodeId = params.id

        const { data: episode, error: fetchError } = await supabaseAdmin
            .from('episodes')
            .select('*, stories(*)')
            .eq('id', episodeId)
            .single()

        if (fetchError || !episode) {
            throw new Error(`Could not find episode: ${fetchError?.message}`)
        }

        const story = episode.stories
        const systemPrompt = `You are a professional Malayalam story writer. Rewrite this specific episode script in pure, natural Malayalam script. Use clear conversational yet literary syntax optimized for Text-to-Speech narration. End the episode with an emotional hook or cliffhanger.`

        const userPrompt = `We are regenerating Episode ${episode.episode_number} ("${episode.title_malayalam || 'Untitled'}") for the ${story.genre} story titled "${story.title_english}" (${story.title_malayalam}).
Story Description: ${story.description}

Please write a fresh, engaging script for Episode ${episode.episode_number} in pure Malayalam.
Return ONLY a JSON object matching this schema:
{
  "title_malayalam": "updated episode title in Malayalam",
  "script_text": "the complete rewritten Malayalam script..."
}`

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        })

        const result = await model.generateContent(userPrompt)
        const rawText = result.response.text()
        const regeneratedData = extractCleanJson(rawText)

        const { data: updatedEpisode, error: updateError } = await supabaseAdmin
            .from('episodes')
            .update({
                title_malayalam: regeneratedData.title_malayalam || episode.title_malayalam,
                script_text: regeneratedData.script_text,
                status: 'draft',
            })
            .eq('id', episodeId)
            .select('*')
            .single()

        if (updateError) {
            throw new Error(`Failed to update episode: ${updateError.message}`)
        }

        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_script',
            story_id: story.id,
            episode_id: episodeId,
            notes: `Regenerated script for Episode ${episode.episode_number} using gemini-3.5-flash.`,
        })

        return NextResponse.json({ success: true, episode: updatedEpisode })
    } catch (error: any) {
        console.error('Episode Regeneration Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Regeneration failed' },
            { status: 500 }
        )
    }
}