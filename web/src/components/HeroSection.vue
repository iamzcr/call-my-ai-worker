<template>
  <section id="hero" class="hero">
    <div class="hero-blob hero-blob-1"></div>
    <div class="hero-blob hero-blob-2"></div>
    <div class="hero-inner">
      <div class="hero-badge">浏览器扩展 · Manifest V3</div>
      <h1 class="hero-title">
        一次提问，<span class="grad">多个 AI</span> 同时回答
      </h1>
      <p class="hero-sub">
        同页 iframe 平铺各 AI 网页，勾选站点、输入问题，一键分发。
        各站点实时展示与生成，省去来回切换。
      </p>
      <div class="hero-actions">
        <a class="btn-primary" href="#" @click.prevent>安装到浏览器</a>
        <a class="btn-ghost" href="#" @click.prevent="goHow">查看使用教程 ↓</a>
      </div>
      <div class="hero-note">支持国内 / 海外多站点 · 默认勾选常用国内站点</div>

      <div class="mock-wrap">
        <div class="mock-window">
          <div class="mock-chrome">
            <span class="dot dot-r"></span><span class="dot dot-y"></span><span class="dot dot-g"></span>
            <span class="mock-url">call-my-ai-worker</span>
          </div>
          <div class="carousel">
            <transition-group name="fade">
              <img
                v-for="(img, i) in demoImages"
                v-show="current === i"
                :key="img"
                class="carousel-img"
                :src="img"
                :alt="'演示 ' + (i + 1)"
                @click="openLightbox(i)"
              />
            </transition-group>
            <button class="carousel-zoom" @click="openLightbox(current)" title="点击放大">⤢</button>
            <div class="carousel-dots">
              <button
                v-for="(img, i) in demoImages"
                :key="'dot' + i"
                class="carousel-dot"
                :class="{ active: current === i }"
                @click="current = i"
              ></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <transition name="modal">
    <div v-if="lightboxOpen" class="lightbox" @click.self="closeLightbox">
      <button class="lightbox-close" @click="closeLightbox" title="关闭">&times;</button>
      <img class="lightbox-img" :src="demoImages[lightboxIndex]" :alt="'演示 ' + (lightboxIndex + 1)" @click.stop />
      <div class="lightbox-nav">
        <button class="lightbox-prev" @click.stop="step(-1)" title="上一张">‹</button>
        <span class="lightbox-count">{{ lightboxIndex + 1 }} / {{ demoImages.length }}</span>
        <button class="lightbox-next" @click.stop="step(1)" title="下一张">›</button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { scrollTo } from '@/router'

const demoImages = ['demo/1.png', 'demo/2.png']
const current = ref(0)
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)
let timer = null

function startCarousel() {
  stopCarousel()
  timer = setInterval(() => {
    current.value = (current.value + 1) % demoImages.length
  }, 3500)
}
function stopCarousel() {
  if (timer) { clearInterval(timer); timer = null }
}

function openLightbox(i) {
  lightboxIndex.value = i
  lightboxOpen.value = true
  stopCarousel()
}
function closeLightbox() {
  lightboxOpen.value = false
  startCarousel()
}
function step(dir) {
  lightboxIndex.value = (lightboxIndex.value + dir + demoImages.length) % demoImages.length
}

function onKey(e) {
  if (!lightboxOpen.value) return
  if (e.key === 'Escape') closeLightbox()
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === 'ArrowRight') step(1)
}

onMounted(() => {
  startCarousel()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  stopCarousel()
  window.removeEventListener('keydown', onKey)
})

function goHow() {
  scrollTo('#how')
}
</script>

<style scoped>
.hero {
  position: relative;
  padding: 158px 24px 0;
  text-align: center;
  overflow: hidden;
  background:
    radial-gradient(900px 380px at 50% -80px, #eef2ff 0%, rgba(238, 242, 255, 0) 70%),
    var(--bg);
}
.hero-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
  pointer-events: none;
}
.hero-blob-1 {
  width: 420px;
  height: 420px;
  background: #c7d2fe;
  top: -140px;
  left: -120px;
  animation: drift 14s ease-in-out infinite alternate;
}
.hero-blob-2 {
  width: 360px;
  height: 360px;
  background: #bae6fd;
  top: 40px;
  right: -140px;
  animation: drift 18s ease-in-out infinite alternate-reverse;
}
@keyframes drift {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(40px, 30px) scale(1.08); }
}
.hero-inner {
  position: relative;
  max-width: 880px;
  margin: 0 auto;
}
.hero-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
  border: 1px solid #e0e7ff;
}
.hero-title {
  font-size: 52px;
  line-height: 1.18;
  margin-bottom: 22px;
  letter-spacing: -0.02em;
}
.grad {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-sub {
  font-size: 18px;
  color: var(--text-soft);
  max-width: 560px;
  margin: 0 auto 38px;
}
.hero-actions {
  display: flex;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
  padding: 13px 32px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.32);
  transition: box-shadow 0.25s var(--ease), transform 0.25s var(--ease), background 0.25s;
}
.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(79, 70, 229, 0.38);
}
.btn-ghost {
  background: #fff;
  color: var(--text);
  padding: 13px 32px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 600;
  border: 1px solid var(--border);
  transition: border-color 0.2s, transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
}
.btn-ghost:hover {
  border-color: #c7d2fe;
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.hero-note {
  margin-top: 30px;
  font-size: 14px;
  color: var(--text-muted);
}

/* product mock */
.mock-wrap {
  margin-top: 72px;
  padding: 0 8px;
}
.mock-window {
  max-width: 900px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.02);
  overflow: hidden;
  transform: perspective(1600px) rotateX(2deg);
  transform-origin: center bottom;
}
.mock-chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border-soft);
}
.dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
.dot-r { background: #fca5a5; }
.dot-y { background: #fcd34d; }
.dot-g { background: #86efac; }
.mock-url {
  margin-left: 12px;
  flex: 1;
  max-width: 280px;
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 4px 12px;
  text-align: left;
}
.carousel {
  position: relative;
  height: 420px;
  background: #f8fafc;
  overflow: hidden;
}
.carousel-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  padding: 8px;
  cursor: zoom-in;
}
.carousel-zoom {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-soft);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.12);
  transition: transform 0.2s var(--ease), color 0.2s, box-shadow 0.2s;
  z-index: 2;
}
.carousel-zoom:hover {
  transform: scale(1.1);
  color: var(--primary);
  box-shadow: 0 4px 14px rgba(79, 70, 229, 0.25);
}
.carousel-dots {
  position: absolute;
  bottom: 14px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 8px;
}
.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  background: #cbd5e1;
  cursor: pointer;
  padding: 0;
  transition: background 0.25s, transform 0.25s;
}
.carousel-dot.active {
  background: var(--primary);
  transform: scale(1.25);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s var(--ease);
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* lightbox */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(6px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px 64px;
}
.lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  width: 46px;
  height: 46px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.24);
  transform: scale(1.08);
}
.lightbox-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  background: #fff;
  cursor: default;
  user-select: none;
}
.lightbox-nav {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}
.lightbox-prev,
.lightbox-next {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.lightbox-prev:hover,
.lightbox-next:hover {
  background: rgba(255, 255, 255, 0.24);
  transform: scale(1.08);
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s var(--ease);
}
.modal-enter-active .lightbox-img,
.modal-leave-active .lightbox-img {
  transition: transform 0.25s var(--ease);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .lightbox-img,
.modal-leave-to .lightbox-img {
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .hero {
    padding: 120px 20px 0;
  }
  .hero-title {
    font-size: 34px;
  }
  .hero-sub {
    font-size: 16px;
  }
  .carousel {
    height: 240px;
  }
  .mock-window {
    transform: none;
  }
}
</style>
