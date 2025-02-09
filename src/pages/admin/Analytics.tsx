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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
} from 'recharts'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../../lib/supabase'
import { trackEvent, calculateMetrics, generatePrediction } from '../../utils/analytics'

export function Analytics() {
  const [period, setPeriod] = useState('7')
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

      // Buscar métricas
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
      console.error('Error loading analytics data:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados analíticos',
        status: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  async function generateSalesPrediction() {
    try {
      setLoading(true)

      const prediction = await generatePrediction(
        'sales_forecast',
        'total_sales',
        {
          // Features para o modelo
          historical_data: metrics,
          seasonality: true,
          trends: true,
        }
      )

      toast({
        title: 'Sucesso',
        description: 'Previsão gerada com sucesso',
        status: 'success',
      })

      fetchData()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao gerar previsão',
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
          <Heading size="lg">Analytics</Heading>
          <Select
            w="200px"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="15">Últimos 15 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </Select>
        </Box>

        <Tabs>
          <TabList>
            <Tab>Visão Geral</Tab>
            <Tab>Previsões</Tab>
            <Tab>Comportamento</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Grid templateColumns="repeat(3, 1fr)" gap={6} mb={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Taxa de Conversão</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text fontSize="3xl" fontWeight="bold">
                      {(Math.random() * 10).toFixed(1)}%
                    </Text>
                    <Text color="gray.500">
                      +2.1% em relação ao período anterior
                    </Text>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">Ticket Médio</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text fontSize="3xl" fontWeight="bold">
                      R$ {(Math.random() * 1000).toFixed(2)}
                    </Text>
                    <Text color="gray.500">
                      -1.5% em relação ao período anterior
                    </Text>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <Heading size="md">Taxa de Retenção</Heading>
                  </CardHeader>
                  <CardBody>
                    <Text fontSize="3xl" fontWeight="bold">
                      {(Math.random() * 100).toFixed(1)}%
                    </Text>
                    <Text color="gray.500">
                      +5.3% em relação ao período anterior
                    </Text>
                  </CardBody>
                </Card>
              </Grid>

              <Card mb={6}>
                <CardHeader>
                  <Heading size="md">Vendas por Período</Heading>
                </CardHeader>
                <CardBody>
                  <Box h="400px">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="start_date"
                          tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                        />
                        <YAxis />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#0ea5e9"
                          fill="#0ea5e9"
                          fillOpacity={0.1}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </CardBody>
              </Card>
            </TabPanel>

            <TabPanel px={0}>
              <Stack spacing={6}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Heading size="md">Previsões de Vendas</Heading>
                  <Button
                    onClick={generateSalesPrediction}
                    isLoading={loading}
                  >
                    Gerar Nova Previsão
                  </Button>
                </Box>

                <Card>
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

                <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                  <Card>
                    <CardHeader>
                      <Heading size="md">Precisão do Modelo</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="3xl" fontWeight="bold">
                        95.2%
                      </Text>
                      <Text color="gray.500">
                        Baseado nos últimos 30 dias
                      </Text>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Heading size="md">Tendência</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="3xl" fontWeight="bold" color="green.500">
                        +12.5%
                      </Text>
                      <Text color="gray.500">
                        Crescimento previsto
                      </Text>
                    </CardBody>
                  </Card>
                </Grid>
              </Stack>
            </TabPanel>

            <TabPanel px={0}>
              <Stack spacing={6}>
                <Card>
                  <CardHeader>
                    <Heading size="md">Comportamento do Cliente</Heading>
                  </CardHeader>
                  <CardBody>
                    <Box h="400px">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="start_date"
                            tickFormatter={(date) => format(new Date(date), 'dd/MM', { locale: ptBR })}
                          />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#0ea5e9" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardBody>
                </Card>

                <Grid templateColumns="repeat(3, 1fr)" gap={6}>
                  <Card>
                    <CardHeader>
                      <Heading size="md">Tempo Médio de Sessão</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="3xl" fontWeight="bold">
                        5m 32s
                      </Text>
                      <Text color="gray.500">
                        +45s em relação ao período anterior
                      </Text>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Heading size="md">Taxa de Rejeição</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="3xl" fontWeight="bold">
                        32.5%
                      </Text>
                      <Text color="gray.500">
                        -5.2% em relação ao período anterior
                      </Text>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHeader>
                      <Heading size="md">Páginas por Sessão</Heading>
                    </CardHeader>
                    <CardBody>
                      <Text fontSize="3xl" fontWeight="bold">
                        4.2
                      </Text>
                      <Text color="gray.500">
                        +0.8 em relação ao período anterior
                      </Text>
                    </CardBody>
                  </Card>
                </Grid>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>
    </Container>
  )
}