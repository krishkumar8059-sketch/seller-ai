// Razorpay Order Creation
// Creates a Razorpay order for the selected plan.
// key_secret is read from environment variables and NEVER exposed to the frontend.

export async function onRequestPost(context) {
  try {
    const RAZORPAY_KEY_ID = context.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = context.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Razorpay configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const body = await context.request.json();
    const { planId, period, email } = body;

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // Plan prices in paise (INR * 100)
    const prices = {
      basic: { monthly: 24900, yearly: 109900 },
      pro: { monthly: 89900, yearly: 129900 },
      premium: { monthly: 149900, yearly: 799900 }
    };

    if (!prices[planId]) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const amount = prices[planId][period || 'monthly'];
    const receipt = 'rf_' + planId + '_' + Date.now();

    // Create order via Razorpay API
    const auth = Buffer.from(RAZORPAY_KEY_ID + ':' + RAZORPAY_KEY_SECRET).toString('base64');

    const orderData = {
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        planId: planId,
        period: period || 'monthly',
        email: email || ''
      }
    };

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + auth,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const order = await response.json();

    if (order.error) {
      return new Response(JSON.stringify({ error: order.error.description || 'Order creation failed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(JSON.stringify({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    }), {
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
