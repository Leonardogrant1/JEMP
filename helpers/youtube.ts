export function youtubeThumbUrl(url: string): string {
    const match = url.match(/(?:v=|\/)([\w-]{11})/);
    return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : '';
}
