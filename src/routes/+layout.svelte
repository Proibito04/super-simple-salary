<script lang="ts">
  import '../app.css'
  import { pwaInfo } from 'virtual:pwa-info'
  import { onMount, setContext } from 'svelte'
  import { AppBar } from '@skeletonlabs/skeleton'
  import IconAccessibility from '~icons/solar/hamburger-menu-outline'
  import { setDefaultOptions } from 'date-fns'
  import { enUS, fr, it as itLocale } from 'date-fns/locale'
  import { page } from '$app/stores'
  import { toasts } from '$lib/toast'
  import Portal from './Portal.svelte'
  import Aggiungi from './aggiungi.svelte'
  import { editingDay } from '$lib/store'
  import { initLang, t, currentLang, changeLang } from '$lib/i18n'

  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();

  let visibleAdd = $state(false)
  let webManifest = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '')
  let loaded: boolean = $state(false)
  let dbError: string = $state('')
  let showPortal: boolean = $state(false)
  let activeRoute = $derived($page.url.pathname)
  let showUpdatesModal = $state(false)

  type menuItem = { label: string; link: string }
  const links: menuItem[] = [
    { label: 'home', link: 'home' },
    { label: 'statistiche', link: 'statistiche' },
    { label: 'aziende', link: 'aziende' }
  ]

  function toggleAggiungi() {
    if (visibleAdd) {
      visibleAdd = false
    } else if ($editingDay) {
      editingDay.set(null)
    } else {
      visibleAdd = true
    }
  }

  async function importGourmetPreset() {
    try {
      const DB = (await import('$lib/database')).DB
      const gourmetPreset = {
        id: 'gourmet-in-villa',
        name: 'Gourmet in Villa',
        hourlyWage: 10,
        customSettings: [
          { id: 'gourmet-macchina', name: 'Macchina', amount: 20 },
          { id: 'gourmet-muma', name: 'Rimborso Muma', amount: 30 },
          { id: 'gourmet-con-macchina', name: 'Con la tua macchina', amount: 40 }
        ]
      }
      await DB.addCompany(JSON.parse(JSON.stringify(gourmetPreset)))
      toasts.show($t('gourmetSuccess'), "success")
      closeUpdatesModal()
    } catch (e: any) {
      toasts.show($t('gourmetError') + ": " + (e.message || String(e)), "error")
    }
  }

  function closeUpdatesModal() {
    localStorage.setItem('has_seen_updates_v2', 'true')
    showUpdatesModal = false
  }

  // Reactive date-fns locale switcher based on current Lang
  $effect(() => {
    const lang = $currentLang;
    if (lang === 'en') {
      setDefaultOptions({ locale: enUS })
    } else if (lang === 'fr') {
      setDefaultOptions({ locale: fr })
    } else {
      setDefaultOptions({ locale: itLocale })
    }
  })

  setContext('vision', { toggleAggiungi })

  onMount(async () => {
    try {
      initLang()
      const DB = (await import('$lib/database')).DB
      await DB.startDatabase()
      loaded = true
      
      const hasSeen = localStorage.getItem('has_seen_updates_v2')
      if (!hasSeen) {
        showUpdatesModal = true
      }
    } catch (e: any) {
      dbError = e.message || String(e);
      console.error("[DEBUG] Layout DB Init Error:", e);
    }
  })
</script>

<svelte:head>
  {@html webManifest}
  <title>Super simple Salary</title>
</svelte:head>

{#if dbError}
  <div class="p-5 text-red-500 font-bold">
    <h1>Errore di connessione al database:</h1>
    <p>{dbError}</p>
    <p class="text-sm mt-2 text-gray-500">Prova a ricaricare la pagina o controlla di non avere più schede dell'app aperte.</p>
  </div>
{:else if !loaded}
  <div class="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
    <h1 class="text-sm font-black text-gray-400 dark:text-gray-500 tracking-wider uppercase animate-pulse">Caricamento in corso...</h1>
  </div>
{:else}
  {#if visibleAdd || $editingDay}
    <Aggiungi />
  {/if}

  <AppBar
    gridColumns="grid-cols-[auto_1fr_auto]"
    slotTrail="place-content-end"
    class="dark:bg-slate-950 dark:text-white border-b dark:border-slate-900"
  >
    {#snippet lead()}
      <div class="flex items-center gap-6">
        <span class="font-black tracking-tight text-lg mr-2 text-green-600">Stipendio 💸</span>
        <nav class="hidden md:flex items-center gap-1.5">
          {#each links as single}
            {@const isHome = single.link === 'home'}
            {@const path = isHome ? '/' : `/${single.link}`}
            <a
              href={`./${isHome ? '' : single.link}`}
              class="text-xs font-black px-3 py-1.5 rounded-xl transition hover:bg-green-50 dark:hover:bg-green-950/20 hover:text-green-600 {activeRoute === path ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : 'text-gray-500 dark:text-gray-400'}"
            >
              <span class="capitalize">{$t(single.link === 'home' ? 'home' : (single.link === 'statistiche' ? 'stats' : 'companies'))}</span>
            </a>
          {/each}
        </nav>
      </div>
    {/snippet}
    
    <div></div>
    
    {#snippet trail()}
      <button class="rounded-xl bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700 shadow-md active:scale-95 transition" onclick={() => (visibleAdd = true)}>
        {$t('add')}
      </button>
    {/snippet}
  </AppBar>
  <main class="m-auto px-2 lg:w-1/2 pb-24 md:pb-6">
    {@render children?.()}

    <!-- Footer Language Selector -->
    <footer class="mt-12 mb-6 border-t dark:border-slate-850 pt-6 text-center flex flex-col items-center gap-2">
      <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">{$t('selectLanguage')}</span>
      <div class="flex gap-2">
        <button
          onclick={() => changeLang('it')}
          class="px-2.5 py-1 text-xs font-black rounded-lg border transition {$currentLang === 'it' ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-900'}"
        >
          🇮🇹 Italiano
        </button>
        <button
          onclick={() => changeLang('en')}
          class="px-2.5 py-1 text-xs font-black rounded-lg border transition {$currentLang === 'en' ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-900'}"
        >
          🇬🇧 English
        </button>
        <button
          onclick={() => changeLang('fr')}
          class="px-2.5 py-1 text-xs font-black rounded-lg border transition {$currentLang === 'fr' ? 'bg-green-600 border-green-600 text-white shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-900'}"
        >
          🇫🇷 Français
        </button>
      </div>
    </footer>
  </main>

  <!-- Mobile sticky floating bottom navigation bar -->
  {#if !showUpdatesModal}
    <div class="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4 md:hidden">
      <div class="mx-auto max-w-md bg-white/90 dark:bg-slate-950/90 backdrop-blur-md rounded-2xl border dark:border-slate-850 shadow-xl flex justify-around items-center py-2 px-2">
        {#each links as single}
          {@const isHome = single.link === 'home'}
          {@const path = isHome ? '/' : `/${single.link}`}
          <a
            href={`./${isHome ? '' : single.link}`}
            class="flex flex-col items-center gap-0.5 text-[9px] font-black transition-all py-1 px-2.5 rounded-xl active:scale-95 {activeRoute === path ? 'text-green-600 bg-green-50/50 dark:bg-green-950/30' : 'text-gray-400 dark:text-gray-500'}"
          >
            {#if single.label === 'home'}
              <span class="text-lg">🏠</span>
            {:else if single.label === 'statistiche'}
              <span class="text-lg">📊</span>
            {:else if single.label === 'aziende'}
              <span class="text-lg">🏢</span>
            {/if}
            <span class="capitalize">{$t(single.link === 'home' ? 'home' : (single.link === 'statistiche' ? 'stats' : 'companies'))}</span>
          </a>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Toast Notification Overlay -->
  {#if $toasts.length > 0}
    <div class="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
      {#each $toasts as toast (toast.id)}
        <div
          class="p-4 rounded-2xl shadow-xl border text-xs font-black flex items-center gap-2.5 transition-all duration-300
                 {toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-900 dark:text-green-200' : ''}
                 {toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200' : ''}
                 {toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-900 dark:text-blue-200' : ''}"
        >
          {#if toast.type === 'success'}
            <span class="text-base">✅</span>
          {:else if toast.type === 'error'}
            <span class="text-base">❌</span>
          {:else}
            <span class="text-base">ℹ️</span>
          {/if}
          <span>{toast.message}</span>
        </div>
      {/each}
    </div>
  {/if}
{/if}

{#if showUpdatesModal}
  <Portal>
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
      <div class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white font-sans">
        <!-- Header -->
        <div class="text-center mb-6">
          <span class="text-4xl">🎉 🥳 ✨</span>
          <h2 class="text-2xl font-black mt-2 text-gray-900 dark:text-white">{$t('welcomeTitle')}</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">{$t('welcomeSubtitle')}</p>
        </div>

        <!-- Updates List -->
        <div class="flex flex-col gap-3 mb-6 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border dark:border-slate-850">
          <h3 class="text-sm font-black text-green-600 dark:text-green-400 uppercase tracking-wider">{$t('welcomeSubtitle')}</h3>
          
          <div class="flex gap-2.5 items-start text-xs">
            <span>🎨</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem1')}</p>
          </div>
          <div class="flex gap-2.5 items-start text-xs">
            <span>🚗</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem2')}</p>
          </div>
          <div class="flex gap-2.5 items-start text-xs">
            <span>📊</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem3')}</p>
          </div>
          <div class="flex gap-2.5 items-start text-xs">
            <span>📱</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem4')}</p>
          </div>
          <div class="flex gap-2.5 items-start text-xs">
            <span>🔔</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem5')}</p>
          </div>
          <div class="flex gap-2.5 items-start text-xs">
            <span>🛠️</span>
            <p class="text-gray-600 dark:text-gray-400 font-bold">{$t('welcomeItem6')}</p>
          </div>
        </div>

        <!-- Gourmet in Villa Section -->
        <div class="mb-6 p-4 rounded-2xl border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 text-center">
          <h4 class="text-sm font-black text-green-700 dark:text-green-300">🏰 {$t('gourmetSection')} 🏰</h4>
          <p class="text-xs text-green-600 dark:text-green-400 mt-1 mb-3 font-semibold">
            {$t('gourmetDescription')}
          </p>
          <button
            onclick={importGourmetPreset}
            class="mx-auto rounded-xl bg-green-600 hover:bg-green-700 px-5 py-2.5 text-xs font-black text-white shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <span>🎉</span> {$t('gourmetButton')}
          </button>
        </div>

        <!-- Footer -->
        <div class="flex justify-end gap-3 border-t pt-4 dark:border-slate-800">
          <button
            onclick={closeUpdatesModal}
            class="rounded-xl border px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-750 dark:text-gray-300 dark:hover:bg-slate-800 transition active:scale-95 w-full sm:w-auto bg-green-600 text-white hover:bg-green-700"
          >
            {$t('startWorking')}
          </button>
        </div>
      </div>
    </div>
  </Portal>
{/if}
