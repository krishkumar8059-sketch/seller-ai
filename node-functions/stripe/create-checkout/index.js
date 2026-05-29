// Stripe Subscription Checkout Session Creator
// Creates a Stripe Checkout session for subscription-based plans.
// The secret key is read from environment variables and NEVER exposed to the frontend.

export async function onRequestPost(context) {
  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await context.request.json();
    const { email, planId, period } = body;

    if (!email || !planId) {
      return new Response(JSON.stringify({ error: 'Email and plan ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Plan prices in paise (INR * 100)
    const prices = {
      basic: { monthly: 24900, yearly: 109900 },
      pro: { monthly: 89900, yearly: 799900 },
      premium: { monthly: 149900, yearly: 129900 }
    };

    if (!prices[planId]) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const amount = prices[planId][period || 'monthly'];
    const interval = period === 'yearly' ? 'year' : 'month';
    const planNames = { basic: 'ResellFlowAI Basic', pro: 'ResellFlowAI Pro', premium: 'ResellFlowAI Premium' };

    const origin = context.request.headers.get('origin') || '';
    const params = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'customer_email': email,
      'mode': 'subscription',
      'line_items[0][price_data][currency]': 'inr',
      'line_items[0][price_data][product_data][name]': planNames[planId],
      'line_items[0][price_data][product_data][description]': planId.charAt(0).toUpperCase() + planId.slice(1) + ' plan - ' + (period === 'yearly' ? 'Yearly' : 'Monthly') + ' subscription',
      'line_items[0][price_data][unit_amount]': amount.toString(),
      'line_items[0][price_data][recurring][interval]': interval,
      'line_items[0][quantity]': '1',
      'success_url': origin + '/?payment=success&plan=' + planId,
      'cancel_url': origin + '/?payment=cancel',
      'metadata[planId]': planId,
      'metadata[period]': period || 'monthly'
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await response.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
