import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const episodeId = params.id

        const { data: episode, error: updateError } = await supabaseAdmin
            .from('episodes')
            .update({ status: 'approved' })
            .eq('id', episodeId)
            .select('story_id, episode_number, title_malayalam')
            .single()

        if (updateError || !episode) {
            throw new Error(`Failed to approve episode: ${updateError?.message}`)
        }

        await supabaseAdmin.from('admin_logs').insert({
            action: 'approve',
            story_id: episode.story_id,
            episode_id: episodeId,
            notes: `Approved Episode ${episode.episode_number}: "${episode.title_malayalam}"`,
        })

        return NextResponse.json({ success: true, episode })
    } catch (error: any) {
        console.error('Episode Approval Error:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Server error during approval' },
            { status: 500 }
        )
    }
}