export function formatDuration(durationMillis: number): string {
    const minutes = Math.floor(durationMillis / (60*1000))
    const seconds = Math.floor((durationMillis % (60*1000))/1000)
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}