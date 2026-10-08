export const canSpeak = 'speechSynthesis' in window
const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
export const canListen = !!SR

export function speak(text: string) {
  if (!canSpeak) return
  speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}
export function listen(onText: (t: string) => void, onFail: () => void) {
  if (!SR) return onFail()
  const r = new SR(); r.lang = 'en-US'
  r.onresult = (e: any) => onText(e.results[0][0].transcript.toLowerCase())
  r.onerror = onFail
  r.start()
}
