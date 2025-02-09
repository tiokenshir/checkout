import { useEffect, useState } from 'react'
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'
import { useLocation } from 'react-router-dom'
import { useColorMode } from '@chakra-ui/react'

const TOUR_STEPS: Step[] = [
  {
    target: 'body',
    content: 'Bem-vindo ao sistema! Vamos fazer um tour rápido pelas principais funcionalidades.',
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="header-profile"]',
    content: 'Aqui você encontra suas informações de perfil e configurações.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="header-notifications"]',
    content: 'Fique por dentro de todas as atualizações e notificações do sistema.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="sidebar"]',
    content: 'Use o menu lateral para navegar entre as diferentes seções do sistema.',
    placement: 'right',
  },
  {
    target: '[data-tour="shortcuts-help"]',
    content: 'Dica: Use atalhos de teclado para navegar mais rápido! Alt + letra indicada.',
    placement: 'right',
  },
]

export function GuidedTour() {
  const [run, setRun] = useState(false)
  const [steps] = useState<Step[]>(TOUR_STEPS)
  const location = useLocation()
  const { colorMode } = useColorMode()

  useEffect(() => {
    // Check if it's the user's first visit
    const hasSeenTour = localStorage.getItem('hasSeenTour')
    if (!hasSeenTour && location.pathname === '/admin') {
      setRun(true)
    }
  }, [location])

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false)
      localStorage.setItem('hasSeenTour', 'true')
    }
  }

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          primaryColor: '#0ea5e9',
          textColor: colorMode === 'dark' ? '#fff' : '#1a202c',
          backgroundColor: colorMode === 'dark' ? '#2d3748' : '#fff',
        },
      }}
      locale={{
        back: 'Anterior',
        close: 'Fechar',
        last: 'Finalizar',
        next: 'Próximo',
        skip: 'Pular tour',
      }}
    />
  )
}