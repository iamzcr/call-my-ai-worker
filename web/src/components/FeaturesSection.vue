<template>
  <section id="features" class="section">
    <div class="section-head reveal" v-reveal>
      <span class="section-eyebrow">核心特性</span>
      <h2 class="section-title">为多 AI 问答而生</h2>
      <p class="section-sub">为频繁使用多个 AI 问答的用户设计，专注省时与流畅体验</p>
    </div>
    <div class="grid">
      <div
        v-for="(f, i) in features"
        :key="f.title"
        class="card reveal"
        v-reveal="i * 60"
      >
        <div class="card-icon" :class="'tone-' + (i % 4)">{{ f.icon }}</div>
        <h3 class="card-title">{{ f.title }}</h3>
        <p class="card-body">{{ f.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
const features = [
  { icon: '⚡', title: '一次提问，多站并行', desc: '勾选多个站点，输入一个问题一键分发，各站点同时回答。' },
  { icon: '🌏', title: '国内 / 海外分组', desc: '内置多个国内 / 海外主流站点，侧边栏分组展示，默认勾选常用国内站点。' },
  { icon: '💬', title: '上下文保持', desc: '追问自动延续各站点对话；改选站点时仍选中的站点上下文不丢。' },
  { icon: '🔄', title: '单站点刷新重问', desc: '每个站点可单独刷新并重新提交当前问题，不影响其他站点。' },
  { icon: '⏹️', title: '一键停止回答', desc: '点击停止即可让各站点停止生成并中断跟踪，不关闭扩展窗口。' },
  { icon: '🛠️', title: '站点可配置', desc: '选项页可增删站点、调整选择器，支持选择器测试与配置导入导出。' }
]
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.card {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 28px 26px;
  box-shadow: var(--shadow);
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease), border-color 0.3s;
}
.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-glow);
  border-color: #dbe3f5;
}
.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 18px;
  transition: transform 0.3s var(--ease);
}
.card:hover .card-icon {
  transform: scale(1.08) rotate(-4deg);
}
.card-icon.tone-0 { background: var(--primary-soft); }
.card-icon.tone-1 { background: var(--accent-soft); }
.card-icon.tone-2 { background: #fef3c7; }
.card-icon.tone-3 { background: #fce7f3; }
.card-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 8px;
}
.card-body {
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.75;
  margin: 0;
}
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
