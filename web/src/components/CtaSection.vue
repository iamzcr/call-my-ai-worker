<template>
  <section class="cta">
    <div class="cta-inner reveal" v-reveal>
      <div class="cta-glow"></div>
      <h2 class="cta-title">一次提问，省下无数次来回切换</h2>
      <p class="cta-sub">安装 Call My AI Worker，让多个 AI 同时为你回答</p>
      <a class="cta-btn" href="#" @click.prevent>安装插件</a>
      <div class="cta-note">免费 · 本地运行 · 无数据收集</div>
    </div>
  </section>
</template>

<script setup>
</script>

<style scoped>
.cta {
  padding: 40px 24px 96px;
}
.cta-inner {
  position: relative;
  max-width: 1080px;
  margin: 0 auto;
  text-align: center;
  padding: 72px 40px;
  border-radius: 28px;
  background: linear-gradient(135deg, #4f46e5 0%, #6366f1 45%, #06b6d4 100%);
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(79, 70, 229, 0.32);
}
.cta-glow {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  filter: blur(90px);
  top: -260px;
  right: -120px;
  pointer-events: none;
}
.cta-title {
  position: relative;
  color: #fff;
  font-size: 34px;
  letter-spacing: -0.01em;
  margin-bottom: 12px;
}
.cta-sub {
  position: relative;
  color: rgba(255, 255, 255, 0.85);
  font-size: 16px;
  margin: 0 0 32px;
}
.cta-btn {
  position: relative;
  display: inline-block;
  background: #fff;
  color: var(--primary);
  padding: 13px 34px;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
  transition: transform 0.25s var(--ease), box-shadow 0.25s var(--ease);
}
.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(15, 23, 42, 0.28);
}
.cta-note {
  position: relative;
  margin-top: 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}
@media (max-width: 768px) {
  .cta {
    padding: 24px 20px 64px;
  }
  .cta-inner {
    padding: 52px 24px;
  }
  .cta-title {
    font-size: 26px;
  }
}
</style>
