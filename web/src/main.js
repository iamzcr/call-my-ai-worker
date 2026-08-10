import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/base.css'

const app = createApp(App)

// scroll reveal directive: v-reveal (optional delay via binding value in ms)
const observer = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
  : null

app.directive('reveal', {
  mounted(el, binding) {
    el.classList.add('reveal')
    if (binding.value) el.style.setProperty('--reveal-delay', binding.value + 'ms')
    if (observer) observer.observe(el)
    else el.classList.add('is-visible')
  }
})

app.use(router).mount('#app')
