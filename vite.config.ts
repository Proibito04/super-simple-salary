import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [sveltekit(), SvelteKitPWA({ registerType: 'autoUpdate' }), Icons({ compiler: 'svelte' })]
});
