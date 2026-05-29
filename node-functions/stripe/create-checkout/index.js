// Stripe Checkout Session Creator
// This Node Function creates a Stripe Checkout session for premium subscription.
// The secret key is read from environment variables and NEVER exposed to the frontend.

export async function onRequestPost(context) {
  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await context.request.json();
    const { email, priceId } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create checkout session using Stripe API directly (fetch-based, no SDK needed)
    const sessionParams = new URLSearchParams({
      'payment_method_types[0]': 'card',
      'customer_email': email,
      'mode': 'payment',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': 'ResellFlowAI Premium',
      'line_items[0][price_data][product_data][description]': 'Lifetime premium access - No Watermark, HD Export, AI Voiceover, Video Ads, Integrations',
      'line_items[0][price_data][unit_amount]': '999', // $9.99 one-time
      'line_items[0][quantity]': '1',
      'success_url': context.request.headers.get('origin') + '/?payment=success',
      'cancel_url': context.request.headers.get('origin') + '/?payment=cancel',
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: sessionParams.toString(),
    });

    const session = await response.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
