import { IconButton, useColorMode, Tooltip } from '@chakra-ui/react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <Tooltip label={colorMode === 'light' ? 'Dark Mode' : 'Light Mode'}>
      <IconButton
        aria-label="Toggle color mode"
        icon={colorMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        onClick={toggleColorMode}
        variant="ghost"
      />
    </Tooltip>
  )
}