// This function is no longer in use.
// Paid plans and Razorpay payment integration have been removed.
// The app now uses a flat 30-credits/month system with no paid tiers.

export async function onRequestPost(context) {
  return new Response(JSON.stringify({ error: 'Payment integration has been discontinued.' }), {
    status: 410,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
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
