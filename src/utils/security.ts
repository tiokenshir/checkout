import { supabase } from '../lib/supabase'

// Rate limiting simples no frontend
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

// Validação de cupom
export async function validateCoupon(code: string, amount: number, productId?: string) {
  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select()
      .eq('code', code)
      .eq('active', true)
      .single()

    if (error) throw new Error('Cupom inválido')

    // Validar cupom
    const now = new Date()
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      throw new Error('Cupom expirado')
    }

    if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
      throw new Error('Cupom esgotado')
    }

    if (coupon.min_purchase_amount && amount < coupon.min_purchase_amount) {
      throw new Error(`Valor mínimo para este cupom: R$ ${coupon.min_purchase_amount}`)
    }

    if (coupon.product_id && coupon.product_id !== productId) {
      throw new Error('Cupom não válido para este produto')
    }

    // Calcular desconto
    const discountAmount = coupon.type === 'percentage'
      ? (amount * coupon.value) / 100
      : Math.min(coupon.value, amount)

    return {
      id: coupon.id,
      discountAmount: Number(discountAmount.toFixed(2)),
    }
  } catch (error) {
    throw error
  }
}

// Registrar uso do cupom
export async function recordCouponUse(
  couponId: string,
  orderId: string
) {
  try {
    // Incrementar contador
    const { error } = await supabase
      .from('coupons')
      .update({
        current_uses: supabase.sql`current_uses + 1`,
      })
      .eq('id', couponId)

    if (error) throw error
  } catch (error) {
    console.error('Error recording coupon use:', error)
    throw error
  }
}

// Validação de documento (CPF/CNPJ)
function validateDocument(value: string): boolean {
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