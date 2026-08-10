<template>
  <header class="navbar-wrap" :class="{ scrolled }">
    <div class="navbar" :class="{ scrolled }">
      <div class="navbar-inner">
        <div class="brand" @click="scrollTo('#hero')">
          <span class="brand-logo-wrap">
            <img class="brand-logo" :src="logo" alt="logo" />
          </span>
          <span class="brand-name">Call My AI Worker</span>
        </div>
        <nav class="nav-links">
          <a
            v-for="item in links"
            :key="item.href"
            class="nav-link"
            :class="{ active: activeHash === item.href }"
            @click.prevent="goTo(item.href)"
          >{{ item.label }}</a>
        </nav>
        <a class="install-btn" href="#" @click.prevent>
          <span class="shine"></span>
          <span class="install-dot"></span>安装插件
        </a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { scrollTo } from '@/router'
import logo from '@/assets/logo.png'

const scrolled = ref(false)
const activeHash = ref('')

function onScroll() {
  scrolled.value = window.scrollY > 8
  // mark active section
  const sections = ['#how', '#features', '#hero']
  let current = '#hero'
  for (const sel of sections) {
    const el = document.querySelector(sel)
    if (el && el.getBoundingClientRect().top <= 140) current = sel
  }
  activeHash.value = current
}

function goTo(hash) {
  activeHash.value = hash
  scrollTo(hash)
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { href: '#features', label: '特性' },
  { href: '#how', label: '使用教程' }
]
</script>

<style scoped>
.navbar-wrap {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 14px 24px 0;
  transition: padding 0.35s var(--ease);
}
.navbar-wrap.scrolled {
  padding-top: 10px;
}
.navbar {
  max-width: 1080px;
  margin: 0 auto;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(226, 232, 240, 0.7);
  transition: box-shadow 0.35s var(--ease), border-color 0.35s var(--ease), background 0.35s var(--ease), border-radius 0.35s var(--ease);
}
.navbar.scrolled {
  background: rgba(255, 255, 255, 0.88);
  border-color: rgba(226, 232, 240, 0.95);
  border-radius: 999px;
  box-shadow: 0 10px 32px rgba(15, 23, 42, 0.1), 0 2px 8px rgba(15, 23, 42, 0.05);
}
.navbar-inner {
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
}

/* brand */
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  cursor: pointer;
  user-select: none;
}
.brand-logo-wrap {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--gradient);
  padding: 2px;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
}
.brand:hover .brand-logo-wrap {
  transform: translateY(-1px) rotate(-3deg);
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.38);
}
.brand-logo {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 7px;
  background: #fff;
}
.brand-name {
  font-weight: 700;
  font-size: 16px;
  letter-spacing: -0.01em;
  background: linear-gradient(120deg, #0f172a 30%, #4f46e5 70%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* links */
.nav-links {
  display: flex;
  gap: 6px;
}
.nav-link {
  position: relative;
  color: var(--text-soft);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  padding: 7px 14px;
  border-radius: 999px;
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover {
  color: var(--text);
  background: var(--primary-soft);
}
.nav-link.active {
  color: var(--primary);
  background: var(--primary-soft);
  font-weight: 600;
}

/* install button */
.install-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--gradient);
  color: #fff;
  padding: 9px 20px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.34);
  transition: box-shadow 0.25s var(--ease), transform 0.25s var(--ease);
}
.install-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 26px rgba(79, 70, 229, 0.42);
}
.install-btn .shine {
  position: absolute;
  top: 0;
  left: -60%;
  width: 40%;
  height: 100%;
  background: linear-gradient(105deg, transparent 0%, rgba(255, 255, 255, 0.5) 50%, transparent 100%);
  transform: skewX(-20deg);
  transition: left 0.6s var(--ease);
  pointer-events: none;
}
.install-btn:hover .shine {
  left: 130%;
}
.install-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.3);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(74, 222, 128, 0.12); }
}

@media (max-width: 768px) {
  .navbar-wrap {
    padding: 10px 14px 0;
  }
  .navbar-inner {
    height: 54px;
    padding: 0 14px;
  }
  .nav-links {
    display: none;
  }
}
</style>
