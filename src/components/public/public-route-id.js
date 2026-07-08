const PUBLIC_ID_PREFIX = 'khi_'
const PUBLIC_ID_VERSION = 'v1:'
const PUBLIC_ID_KEY = 'khi-public-route'

function bytesToBase64Url(bytes) {
  if (!bytes?.length) return ''
  if (typeof btoa === 'function') {
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.slice(i, i + 0x8000))
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }
  const BufferCtor = globalThis.Buffer
  if (BufferCtor) {
    return BufferCtor.from(bytes).toString('base64url')
  }
  return ''
}

function base64UrlToBytes(value) {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  if (typeof atob === 'function') {
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  }
  const BufferCtor = globalThis.Buffer
  if (BufferCtor) return new Uint8Array(BufferCtor.from(padded, 'base64'))
  return new Uint8Array()
}

function xorBytes(bytes) {
  const key = new TextEncoder().encode(PUBLIC_ID_KEY)
  return bytes.map((byte, index) => byte ^ key[index % key.length])
}

export function encodePublicCode(code) {
  const raw = String(code || '').trim()
  if (!raw) return ''
  const bytes = new TextEncoder().encode(`${PUBLIC_ID_VERSION}${raw}`)
  return `${PUBLIC_ID_PREFIX}${bytesToBase64Url(xorBytes(bytes))}`
}

export function decodePublicCode(value) {
  const raw = String(value || '').trim()
  if (!raw.startsWith(PUBLIC_ID_PREFIX)) return raw
  try {
    const payload = new TextDecoder().decode(xorBytes(base64UrlToBytes(raw.slice(PUBLIC_ID_PREFIX.length))))
    return payload.startsWith(PUBLIC_ID_VERSION)
      ? payload.slice(PUBLIC_ID_VERSION.length)
      : raw
  } catch {
    return raw
  }
}

export function isEncodedPublicCode(value) {
  const raw = String(value || '').trim()
  return raw.startsWith(PUBLIC_ID_PREFIX) && decodePublicCode(raw) !== raw
}

export function publicDetailPath(resource, code) {
  const token = encodePublicCode(code)
  return token ? `/public/${resource}/${token}` : '#'
}
