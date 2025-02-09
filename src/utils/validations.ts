export function validateDocument(value: string): boolean {
  const cleanValue = value.replace(/\D/g, '')
  
  if (cleanValue.length === 11) {
    // CPF validation
    let sum = 0
    let remainder: number

    if (cleanValue === '00000000000') return false

    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleanValue.substring(i - 1, i)) * (11 - i)
    }

    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanValue.substring(9, 10))) return false

    sum = 0
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleanValue.substring(i - 1, i)) * (12 - i)
    }

    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanValue.substring(10, 11))) return false

    return true
  } else if (cleanValue.length === 14) {
    // CNPJ validation
    let size = cleanValue.length - 2
    let numbers = cleanValue.substring(0, size)
    const digits = cleanValue.substring(size)
    let sum = 0
    let pos = size - 7

    if (cleanValue === '00000000000000') return false

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--
      if (pos < 2) pos = 9
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(0))) return false

    size = size + 1
    numbers = cleanValue.substring(0, size)
    sum = 0
    pos = size - 7

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--
      if (pos < 2) pos = 9
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
    if (result !== parseInt(digits.charAt(1))) return false

    return true
  }

  return false
}

export function formatDocument(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length <= 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatPhone(value: string): string {
  const cleanValue = value.replace(/\D/g, '')
  if (cleanValue.length === 11) {
    return cleanValue.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }
  return cleanValue.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
}

export function validatePhone(value: string): boolean {
  const cleanValue = value.replace(/\D/g, '')
  return cleanValue.length >= 10 && cleanValue.length <= 11
}

export function validateEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

// Detecção básica de fraude
export function detectFraud(data: {
  ip?: string
  userAgent?: string
  email: string
  document: string
  attempts?: number
}): { isSuspicious: boolean; reason?: string } {
  // Verificar múltiplas tentativas
  if (data.attempts && data.attempts > 3) {
    return {
      isSuspicious: true,
      reason: 'Múltiplas tentativas de pagamento',
    }
  }

  // Verificar email suspeito
  const suspiciousEmailDomains = ['tempmail.com', 'throwaway.com']
  const emailDomain = data.email.split('@')[1]
  if (suspiciousEmailDomains.includes(emailDomain)) {
    return {
      isSuspicious: true,
      reason: 'Email temporário detectado',
    }
  }

  // Verificar documento inválido
  if (!validateDocument(data.document)) {
    return {
      isSuspicious: true,
      reason: 'Documento inválido',
    }
  }

  return { isSuspicious: false }
}

// Rate limiting
const rateLimits = new Map<string, { count: number; timestamp: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimits.get(key)

  // Limpar registros antigos
  if (record && now - record.timestamp > windowMs) {
    rateLimits.delete(key)
    return true
  }

  // Verificar limite
  if (record) {
    if (record.count >= limit) {
      return false
    }
    record.count++
  } else {
    rateLimits.set(key, { count: 1, timestamp: now })
  }

  return true
}