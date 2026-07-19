import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Kathalokam — Free Malayalam Audio Stories'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
    // Correctly fetch local font in Edge Runtime
    const fontData = await fetch(
        new URL('../../public/fonts/Montserrat-Bold.ttf', import.meta.url)
    ).then((res) => res.arrayBuffer())

    return new ImageResponse(
        (
            <div
                style={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1B4332',
                    backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(212, 160, 23, 0.15) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(253, 246, 236, 0.08) 0%, transparent 50%)',
                    color: '#FDF6EC',
                    fontFamily: '"Montserrat"',
                    padding: '60px',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                {/* Top Border */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        backgroundColor: '#D4A017',
                    }}
                />

                {/* Icon */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '140px',
                        height: '140px',
                        borderRadius: '70px',
                        backgroundColor: 'rgba(253, 246, 236, 0.1)',
                        border: '3px solid #D4A017',
                        fontSize: '72px',
                        marginBottom: '32px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
                    }}
                >
                    📖
                </div>

                {/* Main Content (Title and Subtitle) */}
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        marginBottom: '40px',
                    }}
                >
                    <div style={{ fontSize: '84px', fontWeight: 700, marginBottom: '16px' }}>
                        KATHALOKAM
                    </div>
                    <div style={{ fontSize: '32px', color: '#D4A017', fontWeight: 600 }}>
                        Free Malayalam Audio Stories
                    </div>
                </div>

                {/* Features Tag */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '24px',
                        fontSize: '20px',
                        color: 'rgba(253, 246, 236, 0.8)',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        padding: '12px 32px',
                        borderRadius: '40px',
                        border: '1px solid rgba(253, 246, 236, 0.15)',
                    }}
                >
                    <span>✨ 100% Free</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🎧 AI Narrated</span>
                    <span style={{ color: '#D4A017' }}>•</span>
                    <span>🚫 No Ads</span>
                </div>

                {/* Footer URL */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '24px',
                        fontSize: '18px',
                        color: 'rgba(253, 246, 236, 0.4)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                    }}
                >
                    kathalokam.vercel.app
                </div>
            </div>
        ),
        {
            ...size,
            fonts: [
                {
                    name: 'Montserrat',
                    data: fontData,
                    style: 'normal',
                    weight: 700,
                },
            ],
        }
    )
}