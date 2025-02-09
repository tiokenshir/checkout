import { Box, Container, Flex, Text, IconButton, useDisclosure, Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent, DrawerCloseButton, useBreakpointValue, useColorMode, Button, VStack, Divider } from '@chakra-ui/react'
import { Phone, Mail, Sun, Moon, MessageSquare } from 'lucide-react'

type CheckoutLayoutProps = {
  children: React.ReactNode
}

export function CheckoutLayout({ children }: CheckoutLayoutProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const isMobile = useBreakpointValue({ base: true, md: false })
  const { colorMode, toggleColorMode } = useColorMode()

  const handleWhatsAppClick = () => {
    // Número formatado para WhatsApp
    const phone = '5511987654321'
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  return (
    <Box minH="100vh" bg="gray.50">
      {/* Header com informações do vendedor */}
      <Box 
        bg="white" 
        borderBottom="1px" 
        borderColor="gray.200" 
        py={4} 
        mb={8} 
        position="sticky" 
        top={0} 
        zIndex={10}
        shadow="sm"
      >
        <Container maxW="container.lg">
          <Flex alignItems="center" justifyContent="space-between">
            <Flex alignItems="center" gap={4}>
              <Box
                w={{ base: "40px", md: "48px" }}
                h={{ base: "40px", md: "48px" }}
                borderRadius="full"
                overflow="hidden"
                flexShrink={0}
              >
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80"
                  alt="Foto do vendedor"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Box>
                <Text fontWeight="bold" fontSize={{ base: "sm", md: "md" }}>João da Silva</Text>
                <Text fontSize={{ base: "xs", md: "sm" }} color="gray.600">Consultor Financeiro</Text>
              </Box>
            </Flex>

            {isMobile ? (
              <Flex gap={2}>
                <IconButton
                  aria-label="Tema"
                  icon={colorMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  onClick={toggleColorMode}
                  variant="ghost"
                />
                <IconButton
                  aria-label="Contatos"
                  icon={<Phone size={20} />}
                  onClick={onOpen}
                />
                <Drawer placement="right" onClose={onClose} isOpen={isOpen}>
                  <DrawerOverlay />
                  <DrawerContent>
                    <DrawerCloseButton />
                    <DrawerHeader>Contatos</DrawerHeader>
                    <DrawerBody>
                      <VStack spacing={6} align="stretch">
                        <Box>
                          <Text fontWeight="bold" mb={2}>WhatsApp</Text>
                          <Button
                            leftIcon={<MessageSquare size={20} />}
                            onClick={handleWhatsAppClick}
                            width="full"
                            colorScheme="whatsapp"
                          >
                            Enviar Mensagem
                          </Button>
                        </Box>

                        <Divider />

                        <Box>
                          <Text fontWeight="bold" mb={1}>Telefone</Text>
                          <Text>(11) 98765-4321</Text>
                        </Box>

                        <Box>
                          <Text fontWeight="bold" mb={1}>Email</Text>
                          <Text>joao.silva@exemplo.com</Text>
                        </Box>
                      </VStack>
                    </DrawerBody>
                  </DrawerContent>
                </Drawer>
              </Flex>
            ) : (
              <Flex gap={6} alignItems="center">
                <IconButton
                  aria-label="Tema"
                  icon={colorMode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  onClick={toggleColorMode}
                  variant="ghost"
                />
                <Button
                  leftIcon={<MessageSquare size={20} />}
                  onClick={handleWhatsAppClick}
                  colorScheme="whatsapp"
                  size="sm"
                >
                  WhatsApp
                </Button>
                <Flex alignItems="center" gap={2}>
                  <Phone size={20} />
                  <Text>(11) 98765-4321</Text>
                </Flex>
                <Flex alignItems="center" gap={2}>
                  <Mail size={20} />
                  <Text>joao.silva@exemplo.com</Text>
                </Flex>
              </Flex>
            )}
          </Flex>
        </Container>
      </Box>

      {children}
    </Box>
  )
}