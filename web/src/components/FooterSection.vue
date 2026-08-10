<template>
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-top">
        <div class="footer-brand">
          <img class="footer-logo" :src="logo" alt="logo" />
          <div>
            <div class="footer-name">Call My AI Worker</div>
            <div class="footer-tag">一次提问，多个 AI 同时回答</div>
          </div>
        </div>
        <div class="footer-links">
          <a href="#" @click.prevent>安装插件</a>
          <a href="#" @click.prevent>隐私说明</a>
          <a href="#" @click.prevent>GitHub</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Call My AI Worker</span>
        <span class="ver">v0.5.0</span>
      </div>
    </div>
  </footer>
</template>

<script setup>
import logo from '@/assets/logo.png'
</script>

<style scoped>
.footer {
  border-top: 1px solid var(--border);
  background: var(--bg-soft);
}
.footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 32px;
}
.footer-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
  padding-bottom: 28px;
}
.footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.footer-logo {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
}
.footer-name {
  font-weight: 700;
  font-size: 15px;
}
.footer-tag {
  font-size: 13px;
  color: var(--text-muted);
}
.footer-links {
  display: flex;
  gap: 24px;
}
.footer-links a {
  color: var(--text-soft);
  font-size: 14px;
  transition: color 0.2s;
}
.footer-links a:hover {
  color: var(--primary);
}
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 24px;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 13px;
}
.ver {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 600;
  font-size: 12px;
}
@media (max-width: 600px) {
  .footer-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
