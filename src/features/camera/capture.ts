export async function openCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
  video.srcObject = s
  await video.play()
  return s
}
export const stopCamera = (s?: MediaStream | null) => s?.getTracks().forEach(t => t.stop())

// Resize + JPEG-compress so inference is fast and IndexedDB stays small
export function toDataUrl(src: CanvasImageSource, w: number, h: number, max = 320): string {
  const r = Math.min(1, max / Math.max(w, h))
  const c = document.createElement('canvas')
  c.width = Math.round(w * r); c.height = Math.round(h * r)
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height)
  return c.toDataURL('image/jpeg', 0.7)
}
export const fileToDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const img = new Image()
  img.onload = () => res(toDataUrl(img, img.naturalWidth, img.naturalHeight, 768))
  img.onerror = rej
  img.src = URL.createObjectURL(f)
})
export const shrink = (dataUrl: string, max = 320) => new Promise<string>(res => {
  const img = new Image()
  img.onload = () => res(toDataUrl(img, img.naturalWidth, img.naturalHeight, max))
  img.onerror = () => res(dataUrl)
  img.src = dataUrl
})
