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
          <div class="mock-body">
            <div class="mock-sidebar">
              <div class="mock-question"></div>
              <div class="mock-question short"></div>
              <div class="mock-ask"></div>
              <div class="mock-row" v-for="i in 4" :key="i">
                <span class="mock-check" :class="{ on: i !== 4 }"></span>
                <span class="mock-label" :class="'w' + i"></span>
                <span class="mock-badge" :class="'b' + i"></span>
              </div>
            </div>
            <div class="mock-content">
              <div class="mock-line w-full"></div>
              <div class="mock-line w-90"></div>
              <div class="mock-line w-70"></div>
              <div class="mock-line w-85"></div>
              <div class="mock-line w-50"></div>
              <div class="mock-cursor"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { scrollTo } from '@/router'

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
.mock-body {
  display: flex;
  height: 320px;
}
.mock-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: #fafbfc;
  border-right: 1px solid var(--border-soft);
  padding: 16px 14px;
  text-align: left;
}
.mock-question {
  height: 14px;
  border-radius: 6px;
  background: #e2e8f0;
  margin-bottom: 10px;
}
.mock-question.short { width: 70%; }
.mock-ask {
  height: 34px;
  border-radius: 10px;
  background: var(--gradient);
  opacity: 0.9;
  margin: 14px 0 20px;
}
.mock-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.mock-check {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  flex-shrink: 0;
}
.mock-check.on {
  background: var(--primary);
  border-color: var(--primary);
}
.mock-label {
  height: 10px;
  border-radius: 4px;
  background: #cbd5e1;
  flex: 1;
}
.mock-label.w1 { max-width: 55%; }
.mock-label.w2 { max-width: 70%; }
.mock-label.w3 { max-width: 45%; }
.mock-label.w4 { max-width: 60%; }
.mock-badge {
  width: 30px;
  height: 12px;
  border-radius: 999px;
  flex-shrink: 0;
}
.mock-badge.b1 { background: #dcfce7; }
.mock-badge.b2 { background: #e0e7ff; }
.mock-badge.b3 { background: #e0e7ff; }
.mock-badge.b4 { background: #f1f5f9; }
.mock-content {
  flex: 1;
  padding: 22px 26px;
  text-align: left;
}
.mock-line {
  height: 13px;
  border-radius: 6px;
  background: #eef2f7;
  margin-bottom: 14px;
}
.mock-line.w-full { width: 100%; }
.mock-line.w-90 { width: 90%; }
.mock-line.w-70 { width: 70%; }
.mock-line.w-85 { width: 85%; }
.mock-line.w-50 { width: 50%; }
.mock-cursor {
  width: 10px;
  height: 18px;
  background: var(--primary);
  border-radius: 2px;
  animation: blink 1.1s step-end infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
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
  .mock-sidebar {
    display: none;
  }
  .mock-body {
    height: 220px;
  }
  .mock-window {
    transform: none;
  }
}
</style>
