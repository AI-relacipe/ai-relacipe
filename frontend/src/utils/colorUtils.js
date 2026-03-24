/**
 * 이미지 URL에서 지배 색상 추출
 * Blob으로 가져와서 Canvas로 분석 (CORS 우회)
 */
export async function getDominantColor(imageUrl) {
  try {
    const res = await fetch(imageUrl)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)

    return await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const size = 50
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        URL.revokeObjectURL(objectUrl)

        try {
          const { data } = ctx.getImageData(0, 0, size, size)
          const freq = {}
          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue // 투명 픽셀 제외
            // 32단위로 양자화 (비슷한 색 묶기)
            const r = Math.round(data[i]     / 32) * 32
            const g = Math.round(data[i + 1] / 32) * 32
            const b = Math.round(data[i + 2] / 32) * 32
            const key = `${r},${g},${b}`
            freq[key] = (freq[key] || 0) + 1
          }
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
          if (top) {
            const [r, g, b] = top[0].split(',').map(Number)
            resolve(`rgb(${r},${g},${b})`)
          } else {
            resolve(null)
          }
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null) }
      img.src = objectUrl
    })
  } catch {
    return null
  }
}
