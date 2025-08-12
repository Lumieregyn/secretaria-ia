import axios from 'axios'
export async function sendWhatsApp({ to, message }) {
  const base = process.env.WPP_BASE_URL
  const session = process.env.WPP_SESSION
  if (!base || !session) return { ok: false, error: 'WPP envs ausentes' }
  // Exemplo real (ajuste para seu gateway):
  // return axios.post(`${base}/message/sendText/${session}`, { phone: to, message })
  return { ok: true, mocked: true }
}
