<template>
  <NavBar />
  <router-view />
  <FooterSection />
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import FooterSection from '@/components/FooterSection.vue'
</script>
