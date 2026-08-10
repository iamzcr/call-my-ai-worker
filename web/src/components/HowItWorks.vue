<template>
  <section id="how" class="section section-tinted">
    <div class="section-head reveal" v-reveal>
      <span class="section-eyebrow">使用教程</span>
      <h2 class="section-title">三步开始使用</h2>
      <p class="section-sub">无需复杂配置，安装登录即可开始</p>
    </div>
    <div class="steps">
      <div
        v-for="(s, i) in steps"
        :key="i"
        class="step reveal"
        v-reveal="i * 100"
      >
        <div class="step-num">{{ i + 1 }}</div>
        <div class="step-connector" v-if="i < steps.length - 1"></div>
        <h3 class="step-title">{{ s.title }}</h3>
        <p class="step-desc">{{ s.desc }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
const steps = [
  { title: '安装扩展', desc: '在浏览器商店安装 Call My AI Worker，并在各 AI 站点登录好账号。' },
  { title: '勾选站点并提问', desc: '左侧勾选要提问的 AI 站点，输入问题后点击「提问」或回车。' },
  { title: '查看与操作', desc: '右侧实时查看各站点回答；可切换站点、刷新重问或一键停止。' }
]
</script>

<style scoped>
.section-tinted {
  max-width: none;
  background: var(--bg-soft);
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
}
.section-tinted > .section-head,
.section-tinted > .steps {
  max-width: 1080px;
  margin-left: auto;
  margin-right: auto;
}
.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.step {
  position: relative;
  text-align: center;
  padding: 36px 24px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  transition: transform 0.3s var(--ease), box-shadow 0.3s var(--ease);
}
.step:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
.step-num {
  width: 48px;
  height: 48px;
  margin: 0 auto 18px;
  border-radius: 50%;
  background: var(--gradient);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
}
.step-connector {
  display: none;
}
.step-title {
  font-size: 17px;
  margin-bottom: 10px;
}
.step-desc {
  color: var(--text-soft);
  font-size: 14px;
  margin: 0;
}
@media (min-width: 901px) {
  .steps {
    gap: 24px;
  }
  .step-connector {
    display: block;
    position: absolute;
    top: 60px;
    right: -26px;
    width: 28px;
    height: 2px;
    background: repeating-linear-gradient(to right, #c7d2fe 0 6px, transparent 6px 12px);
  }
}
@media (max-width: 900px) {
  .steps {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
</style>
