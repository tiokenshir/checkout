import { useEffect, useState } from 'react'
import { Text } from '@chakra-ui/react'

type CountdownTimerProps = {
  expiresAt: string
  onExpire?: () => void
}

export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    function updateTimer() {
      const now = new Date().getTime()
      const expireTime = new Date(expiresAt).getTime()
      const distance = expireTime - now

      if (distance <= 0) {
        setTimeLeft('Expirado')
        onExpire?.()
        return
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((distance % (1000 * 60)) / 1000)

      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    const timer = setInterval(updateTimer, 1000)
    updateTimer()

    return () => clearInterval(timer)
  }, [expiresAt, onExpire])

  return (
    <Text
      fontSize="lg"
      fontWeight="bold"
      color={timeLeft === 'Expirado' ? 'red.500' : 'gray.700'}
    >
      {timeLeft === 'Expirado' ? 'Pagamento Expirado' : `Expira em ${timeLeft}`}
    </Text>
  )
}