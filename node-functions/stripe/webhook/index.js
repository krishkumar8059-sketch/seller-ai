// Stripe Webhook Handler
// Processes Stripe webhook events to confirm payment success.
// The secret key is read from environment variables.

export async function onRequestPost(context) {
  try {
    const STRIPE_SECRET_KEY = context.env.STRIPE_SECRET_KEY;
    const body = await context.request.text();

    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Stripe configuration missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse the event
    let event;
    try {
      event = JSON.parse(body);
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const customerEmail = session.customer_email;

      // In a production app, you would store this in a database/KV
      // For now, we return success - the frontend handles premium status via URL params
      console.log('Payment completed for:', customerEmail);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
