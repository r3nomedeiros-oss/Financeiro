// Registra o Service Worker e força reload automático quando uma nova versão
// (novo deploy do Vercel) assumir o controle. Isso elimina a necessidade de
// recarregar a página 2x após um deploy.
import { registerSW } from 'virtual:pwa-register'

let reloading = false

// Quando o navegador detecta que outro SW assumiu o controle desta página
// (skipWaiting + clientsClaim já estão ligados), recarregamos uma única vez.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

// Registra o SW com autoUpdate ativo.
// - immediate: registra logo no load
// - onNeedRefresh: chamada quando há nova versão -> aplica imediatamente
// - onRegisteredSW: faz polling para detectar novos deploys enquanto a aba fica aberta
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Aplica a atualização. O controllerchange listener acima fará o reload.
    try {
      updateSW(true)
    } catch (_) {
      window.location.reload()
    }
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    // Verifica por novos deploys a cada 60s enquanto a aba está aberta
    setInterval(() => {
      registration.update().catch(() => {})
    }, 60 * 1000)
  },
})
