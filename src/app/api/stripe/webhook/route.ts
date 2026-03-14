import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover'
})

// Use service role key for webhook handler (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Plan mapping based on price IDs
const PLAN_MAP: Record<string, string> = {
  'price_starter_monthly': 'starter',
  'price_starter_annual': 'starter',
  'price_growth_monthly': 'growth',
  'price_growth_annual': 'growth',
  'price_pro_monthly': 'pro',
  'price_pro_annual': 'pro'
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          // Handle subscription creation
          const subscriptionId = session.subscription as string
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any
          const priceId = subscription.items.data[0].price.id
          const plan = PLAN_MAP[priceId] || 'free'

          await supabase
            .from('profiles')
            .update({
              plan,
              stripe_subscription_id: subscription.id,
              subscription_status: subscription.status,
              subscription_current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString()
            })
            .eq('id', session.metadata?.user_id)

        } else if (session.mode === 'payment') {
          // Handle one-time payment for batch
          // Add 100 certificates to user's allowance
          const { data: profile } = await supabase
            .from('profiles')
            .select('certificates_used_this_month')
            .eq('id', session.metadata?.user_id)
            .single()

          if (profile) {
            // Reset usage to allow for the purchased batch
            await supabase
              .from('profiles')
              .update({
                certificates_used_this_month: Math.max(0, (profile.certificates_used_this_month || 0) - 100)
              })
              .eq('id', session.metadata?.user_id)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const priceId = subscription.items.data[0].price.id
        const plan = PLAN_MAP[priceId] || 'free'

        await supabase
          .from('profiles')
          .update({
            plan,
            subscription_status: subscription.status,
            subscription_current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        await supabase
          .from('profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            stripe_subscription_id: null
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any

        if (invoice.subscription) {
          await supabase
            .from('profiles')
            .update({
              subscription_status: 'past_due'
            })
            .eq('stripe_subscription_id', invoice.subscription)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
