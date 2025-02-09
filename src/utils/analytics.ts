import { supabase } from '../lib/supabase'

type AnalyticsEvent = {
  event_type: string
  data: Record<string, any>
  session_id?: string
  user_id?: string
}

type MetricPeriod = 'daily' | 'weekly' | 'monthly'

export async function trackEvent(event: AnalyticsEvent) {
  try {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: event.event_type,
        data: event.data,
        session_id: event.session_id,
        user_id: event.user_id,
      })

    if (error) throw error
  } catch (error) {
    console.error('Error tracking event:', error)
    throw error
  }
}

export async function calculateMetrics(
  name: string,
  period: MetricPeriod,
  startDate: Date,
  endDate: Date
) {
  try {
    // Buscar dados do período
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select()
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (ordersError) throw ordersError

    // Calcular métricas
    const totalOrders = orders.length
    const totalAmount = orders.reduce((sum, order) => sum + order.total_amount, 0)
    const paidOrders = orders.filter(order => order.status === 'paid')
    const conversionRate = (paidOrders.length / totalOrders) * 100

    // Salvar métricas
    const { error } = await supabase
      .from('analytics_metrics')
      .insert({
        name,
        value: totalAmount,
        dimension: 'sales',
        period,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        metadata: {
          totalOrders,
          paidOrders: paidOrders.length,
          conversionRate,
        },
      })

    if (error) throw error

    return {
      totalOrders,
      totalAmount,
      paidOrders: paidOrders.length,
      conversionRate,
    }
  } catch (error) {
    console.error('Error calculating metrics:', error)
    throw error
  }
}

export async function generatePrediction(
  modelType: string,
  targetMetric: string,
  features: Record<string, any>
) {
  try {
    // Buscar dados históricos
    const { data: metrics, error: metricsError } = await supabase
      .from('analytics_metrics')
      .select()
      .eq('name', targetMetric)
      .order('start_date', { ascending: true })

    if (metricsError) throw metricsError

    // Implementar modelo de previsão
    // Este é um exemplo simples usando média móvel
    const values = metrics.map(m => m.value)
    const windowSize = 7
    let sum = 0
    let count = 0

    for (let i = Math.max(0, values.length - windowSize); i < values.length; i++) {
      sum += values[i]
      count++
    }

    const prediction = sum / count
    const confidence = 0.95 // Valor fixo para exemplo

    // Salvar previsão
    const { error } = await supabase
      .from('analytics_predictions')
      .insert({
        model_type: modelType,
        target_metric: targetMetric,
        prediction_date: new Date().toISOString(),
        predicted_value: prediction,
        confidence_score: confidence,
        features,
      })

    if (error) throw error

    return {
      value: prediction,
      confidence,
    }
  } catch (error) {
    console.error('Error generating prediction:', error)
    throw error
  }
}

export async function createDashboard(
  name: string,
  description: string,
  layout: any[],
  widgets: any[]
) {
  try {
    const { data, error } = await supabase
      .from('analytics_dashboards')
      .insert({
        name,
        description,
        layout,
        widgets,
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating dashboard:', error)
    throw error
  }
}

export async function getDashboardData(dashboardId: string) {
  try {
    const { data: dashboard, error: dashboardError } = await supabase
      .from('analytics_dashboards')
      .select()
      .eq('id', dashboardId)
      .single()

    if (dashboardError) throw dashboardError

    // Buscar dados para cada widget
    const widgetData = await Promise.all(
      dashboard.widgets.map(async (widget: any) => {
        const { data, error } = await supabase
          .from('analytics_metrics')
          .select()
          .eq('name', widget.metric)
          .order('start_date', { ascending: true })
          .limit(widget.limit || 30)

        if (error) throw error
        return {
          ...widget,
          data,
        }
      })
    )

    return {
      ...dashboard,
      widgets: widgetData,
    }
  } catch (error) {
    console.error('Error getting dashboard data:', error)
    throw error
  }
}