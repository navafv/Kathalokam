import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Helper function to safely extract and parse JSON from LLM output
function extractCleanJson(rawText: string): any {
    // Strip markdown formatting if present
    let cleaned = rawText
        .replace(/^```json\s*/im, '')
        .replace(/\s*```$/im, '')
        .trim()

    // Isolate only the outer JSON object boundaries
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1)
    }

    return JSON.parse(cleaned)
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { genre, episodes, theme, audience, length } = body

        const wordCountMap: Record<string, number> = {
            'Short (3–5 min)': 400,
            'Medium (8–10 min)': 900,
            'Long (15–20 min)': 1600,
        }
        const wordCount = wordCountMap[length] || 900

        const systemPrompt = `You are a professional Malayalam story writer. Write engaging, culturally rich stories in pure Malayalam script. Your stories should feel natural when read aloud by a text-to-speech system — use clear sentence structures, avoid complex compound words, and write in a conversational yet literary tone. Each episode should end with a cliffhanger or emotional hook to keep listeners coming back.`

        const userPrompt = `Write a complete ${genre} story in Malayalam with ${episodes} episodes.
Theme hint: ${theme || 'None provided, create an original compelling plot'}. Audience: ${audience}. Each episode should be ${length} minutes when read aloud (approximately ${wordCount} Malayalam words per episode).

Return ONLY a JSON object matching this schema:
{
  "title_malayalam": "story title in Malayalam",
  "title_english": "English translation of the title",
  "description": "2-3 sentence description in English for admin reference",
  "cover_emoji": "one relevant emoji",
  "episodes": [
    {
      "episode_number": 1,
      "title_malayalam": "episode title in Malayalam",
      "script_text": "full episode script in Malayalam..."
    }
  ]
}`

        const model = genAI.getGenerativeModel({
            model: 'gemini-3.5-flash',
            systemInstruction: systemPrompt,
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.7,
            },
        })

        const result = await model.generateContent(userPrompt)
        const rawText = result.response.text()

        // Safely parse the response using our extractor
        const storyData = extractCleanJson(rawText)

        // 1. Insert Story into Supabase
        const { data: story, error: storyError } = await supabaseAdmin
            .from('stories')
            .insert({
                title_malayalam: storyData.title_malayalam,
                title_english: storyData.title_english,
                genre: genre.toLowerCase(),
                description: storyData.description,
                cover_emoji: storyData.cover_emoji || '📖',
                total_episodes: Number(episodes),
                status: 'draft',
            })
            .select('id')
            .single()

        if (storyError || !story) {
            throw new Error(`Supabase Story Insert Error: ${storyError?.message}`)
        }

        // 2. Prepare and Insert Episodes
        const episodesToInsert = storyData.episodes.map((ep: any) => ({
            story_id: story.id,
            episode_number: ep.episode_number,
            title_malayalam: ep.title_malayalam,
            script_text: ep.script_text,
            status: 'draft',
            ai_generated: true,
        }))

        const { error: episodesError } = await supabaseAdmin
            .from('episodes')
            .insert(episodesToInsert)

        if (episodesError) {
            throw new Error(`Supabase Episodes Insert Error: ${episodesError.message}`)
        }

        // 3. Log admin action
        await supabaseAdmin.from('admin_logs').insert({
            action: 'generate_script',
            story_id: story.id,
            notes: `AI Generated story "${storyData.title_english}" with ${episodes} episodes using gemini-3.5-flash.`,
        })

        return NextResponse.json({
            success: true,
            story_id: story.id,
            story: storyData,
        })
    } catch (error: any) {
        console.error('Story Generation Failed:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'An unexpected error occurred.' },
            { status: 500 }
        )
    }
}