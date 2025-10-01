/**
 * Cookie Utilities
 * Functions for managing browser cookies
 */

export function getCookie(name: string) {
      const value = `; ${document.cookie}`
      const parts: any = value.split(`; ${name}=`)
      if (parts.length === 2) return parts.pop().split(';').shift()
      return null
}

export function setCookie(name: string, value: string, expirationTime: Date) {
      const expirationDate = new Date(expirationTime)
      document.cookie = `${name}=${value}; expires=${expirationDate}; path=/; Secure; SameSite=Strict`
}
