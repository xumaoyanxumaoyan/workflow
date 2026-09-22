import { createApp } from 'vue'
import TDesign from 'tdesign-vue-next'
import App from './App.vue'
import { router } from './router'

// TDesign 全量样式
import 'tdesign-vue-next/es/style/index.css'
import './styles.css'

createApp(App).use(TDesign).use(router).mount('#app')
