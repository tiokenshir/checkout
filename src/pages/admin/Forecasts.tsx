import { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Heading,
  Grid,
  Card,
  CardHeader,
  CardBody,
  Text,
  Select,
  Stack,
  Button,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
} from '@chakra-ui/react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'

export function Forecasts() {
  const [period, setPeriod] = useState('30')
  const [metrics, setMetrics] = useState<any[]>([])
  const [predictions, setPredictions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    fetchData()
  }, [period])

  async function fetchData() {
    try {
      setLoading(true)

      // Buscar métricas históricas
      const { data: metricsData, error: metricsError } = await supabase
        .from('analytics_metrics')
        .select()
        .gte('start_date', format(subDays(new Date(), parseInt(period)), 'yyyy-MM-dd'))
        .order('start_date', { ascending: true })

      if (metricsError) throw metricsError
      setMetrics(metricsData)

      // Buscar previsões
      const { data: predictionsData, error: predictionsError } = await supabase
        .from('analytics_predictions')
        .select()
        .order('prediction_date', { ascending: true })
        .limit(10)

      if (predictionsError) throw predictionsError
      setPredictions(predictionsData)
    } catch (error) {
      console.error('Error loading forecast data:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados de previsão',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">Previsões</Heading>
          <Select
            w="200px"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="30">Últimos 30 dias</option>
            <option value="60">Últimos 60 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="180">Últimos 180 dias</option>
          </Select>
        </Box>

        <Grid templateColumns="repeat(3, 1fr)" gap={6}>
          <Card>
            <CardHeader>
              <Heading size="md">Previsão de Vendas</Heading>
            </CardHeader>
            <CardBody>
              <Text fontSize="3xl" fontWeight="bold" color="green.500">
                +12.5%
              </Text>
              <Text color="gray.600">
                Crescimento previsto para o próximo mês
              </Text>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Precisão do Modelo</Heading>
            </CardHeader>
            <CardBody>
              <Text fontSize="3xl" fontWeight="bold">
                95.2%
              </Text>
              <Text color="gray.600">
                Baseado nos últimos 30 dias
              </Text>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <Heading size="md">Confiança</Heading>
            </CardHeader>
            <CardBody>
              <Text fontSize="3xl" fontWeight="bold" color="blue.500">
                Alta
              </Text>
              <Text color="gray.600">
                Baseado em 1.2k amostras
              </Text>
            </CardBody>
          </Card>
        </Grid>

        <Tabs>
          <TabList>
            <Tab>Vendas</Tab>
            <Tab>Clientes</Tab>
            <Tab>Produtos</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Heading size="md">Previsão de Vendas</Heading>
                </CardHeader>
                <CardBody>
                  <Box h="400px">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={predictions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="prediction_date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                        />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="predicted_value"
                          stroke="#0ea5e9"
                          fill="#0ea5e9"
                          fillOpacity={0.1}
                          name="Previsão"
                        />
                        <Area
                          type="monotone"
                          dataKey="actual_value"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.1}
                          name="Real"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Heading size="md">Previsão de Novos Clientes</Heading>
                </CardHeader>
                <CardBody>
                  <Box h="400px">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={predictions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="prediction_date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                        />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="predicted_value"
                          stroke="#0ea5e9"
                          name="Previsão"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Card>
                <CardHeader>
                  <Heading size="md">Previsão de Vendas por Produto</Heading>
                </CardHeader>
                <CardBody>
                  <Box h="400px">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={predictions}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="prediction_date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                        />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="predicted_value"
                          stroke="#0ea5e9"
                          name="Previsão"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </CardBody>
              </Card>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  )
}