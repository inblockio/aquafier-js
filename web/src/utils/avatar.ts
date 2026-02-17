import jdenticon from 'jdenticon/standalone'

export function generateAvatar(seed: string, size = 200) {
      const svg = jdenticon.toSvg(seed, size)
      return `data:image/svg+xml;base64,${btoa(svg)}`
}
