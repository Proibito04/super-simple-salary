<script lang="ts">
  import { getContext, onMount } from 'svelte'
  import { format } from 'date-fns'
  import { DB } from '$lib/database'
  import { toasts } from '$lib/toast'
  import { editingDay } from '$lib/store'
  import { t } from '$lib/i18n'
  import type { TimeSlot, WorkedDay, Company, ActiveCustomSetting } from '../types'

  const { toggleAggiungi } = getContext<{ toggleAggiungi: () => void }>('vision')
  
  let giorno = $state(format(new Date(), 'yyyy-MM-dd'))
  let fasceOrarie: TimeSlot[] = $state([{ start: '', end: '' }])
  
  // New features state
  let companies: Company[] = $state([])
  let selectedCompanyId = $state('')
  let payMode = $state<'hourly' | 'fixed'>('hourly')
  let fixedPrice = $state(0)
  let extraEarnings = $state(0)
  let originalDateString = $state('')
  let lastSelectedCompanyId = $state('')
  
  let activeCustomSettings: ActiveCustomSetting[] = $state([])

  let selectedCompany = $derived(companies.find(c => c.id === selectedCompanyId))

  onMount(async () => {
    companies = await DB.getCompanies()
    
    // Prefill form if editing an existing day
    const ed = $editingDay
    if (ed) {
      giorno = format(ed.date, 'yyyy-MM-dd')
      originalDateString = giorno
      fasceOrarie = ed.timeSlots.map(f => ({ ...f }))
      selectedCompanyId = ed.companyId || ''
      lastSelectedCompanyId = selectedCompanyId
      payMode = ed.payMode
      fixedPrice = ed.fixedPrice || 0
      extraEarnings = ed.extraEarnings || 0
      activeCustomSettings = ed.customSettings ? ed.customSettings.map(s => ({ ...s })) : []
    }
  })

  // Watch for selected company changes to initialize the custom settings checkboxes (only when selectedCompanyId changes)
  $effect(() => {
    if (selectedCompanyId !== lastSelectedCompanyId) {
      lastSelectedCompanyId = selectedCompanyId
      if (selectedCompany) {
        activeCustomSettings = (selectedCompany.customSettings || []).map(s => ({
          id: s.id,
          name: s.name,
          amount: s.amount,
          active: true
        }))
      } else {
        activeCustomSettings = []
      }
    }
  })

  // Funzione per aggiungere una nuova fascia oraria
  function aggiungiFasciaOraria() {
    fasceOrarie = [...fasceOrarie, { start: '', end: '' }]
  }

  // Funzione per rimuovere una fascia oraria
  function rimuoviFasciaOraria(index: number) {
    fasceOrarie = fasceOrarie.filter((_, i) => i !== index)
  }

  // Funzione per eliminare l'intero giorno corrente (in modalità modifica)
  async function eliminaGiornoCorrente() {
    const ed = $editingDay
    if (!ed) return
    const formattedDate = format(ed.date, 'dd/MM/yyyy')
    if (confirm(`${$t('confirmDeleteDay')} (${formattedDate})`)) {
      try {
        await DB.deleteWorkedDay(ed)
        toasts.show(`${$t('dayDeleted')} (${formattedDate})`, "success")
        toggleAggiungi()
      } catch (e: any) {
        toasts.show($t('errorDelete') + ": " + (e.message || String(e)), "error")
      }
    }
  }

  // Funzione per salvare il giorno lavorativo nel DB
  async function salvaGiornoLavorato(e: Event) {
    e.preventDefault();

    // Filter out empty time slots
    const validTimeSlots = fasceOrarie.filter(f => f.start && f.end);
    
    if (validTimeSlots.length === 0 && payMode === 'hourly') {
      toasts.show($t('enterValidTimeSlot'), "error");
      return;
    }

    const date = new Date(giorno)
    const newWorkedDay: WorkedDay = {
      date,
      timeSlots: validTimeSlots.map(f => ({ ...f })),
      payMode,
      companyId: selectedCompanyId || undefined,
      companyName: selectedCompany?.name || undefined,
      fixedPrice: payMode === 'fixed' ? fixedPrice : undefined,
      hourlyWage: payMode === 'hourly' ? (selectedCompany?.hourlyWage ?? 10) : undefined,
      customSettings: activeCustomSettings.length > 0 ? activeCustomSettings.map(s => ({ ...s })) : undefined,
      travel: false,
      carUsage: false,
      extraEarnings: extraEarnings > 0 ? extraEarnings : undefined
    }

    try {
      // Se la data è cambiata, elimina il vecchio record per evitare duplicazioni
      if (originalDateString && originalDateString !== giorno) {
        await DB.deleteWorkedDay({ date: new Date(originalDateString) } as WorkedDay)
      }
      
      await DB.addWorkedDay(newWorkedDay)
      toasts.show($editingDay ? $t('shiftUpdated') : $t('shiftSaved'), "success");
      toggleAggiungi()
    } catch (e: any) {
      toasts.show($t('errorSaving') + ": " + (e.message || String(e)), "error");
      console.error(e);
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
  <form
    onsubmit={salvaGiornoLavorato}
    class="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white font-sans"
  >
    <div class="flex items-center justify-between border-b pb-3 mb-5">
      <h2 class="text-xl font-black text-gray-900 dark:text-white">{$editingDay ? $t('editDay') : $t('add')}</h2>
      <button
        type="button"
        class="rounded-xl border px-3 py-1.5 text-xs font-bold hover:bg-gray-100 dark:border-slate-800 dark:hover:bg-slate-800 transition"
        onclick={toggleAggiungi}>{$t('close')}</button
      >
    </div>

    <!-- Giorno -->
    <div class="mb-4">
      <label for="giorno" class="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('day')}:</label>
      <input
        type="date"
        bind:value={giorno}
        id="giorno"
        class="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>

    <!-- Azienda Selection -->
    <div class="mb-4">
      <label for="company" class="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('company')}:</label>
      <select
        bind:value={selectedCompanyId}
        id="company"
        class="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="">{$t('noCompany')}</option>
        {#each companies as comp}
          <option value={comp.id}>{comp.name} ({$t('hours')}: €{comp.hourlyWage}/h)</option>
        {/each}
      </select>
    </div>

    <!-- Modalità di Pagamento -->
    <div class="mb-4">
      <span class="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('payMode')}:</span>
      <div class="flex gap-6 mt-1">
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer font-bold">
          <input type="radio" bind:group={payMode} value="hourly" class="h-4 w-4 text-green-600 focus:ring-green-500" />
          {$t('hoursAllowance')}
        </label>
        <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer font-bold">
          <input type="radio" bind:group={payMode} value="fixed" class="h-4 w-4 text-green-600 focus:ring-green-500" />
          {$t('fixedAllowance')}
        </label>
      </div>
    </div>

    <!-- Rimborsi / Indennità disponibili -->
    <div class="mb-4 rounded-2xl border p-4 dark:border-slate-800 dark:bg-slate-950 flex flex-col gap-3">
      <span class="block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('allowances')}:</span>
      {#if activeCustomSettings.length > 0}
        {#each activeCustomSettings as setting}
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              bind:checked={setting.active}
              id={`setting-${setting.id}`}
              class="h-5 w-5 rounded-lg border text-green-600 focus:ring-green-500 mt-1 cursor-pointer"
            />
            <div class="flex-1">
              <label for={`setting-${setting.id}`} class="text-sm font-bold text-gray-700 dark:text-gray-300 block cursor-pointer">
                {setting.name}
              </label>
              {#if setting.active}
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="text-xs text-gray-400">{$t('amount')} (€):</span>
                  <input
                    type="number"
                    bind:value={setting.amount}
                    min="0"
                    step="1"
                    class="w-24 rounded-lg border border-gray-300 p-1.5 text-xs text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              {/if}
            </div>
          </div>
        {/each}
      {:else}
        <span class="text-xs text-gray-500 dark:text-gray-400">{$t('noAllowances')}</span>
      {/if}
    </div>

    <!-- Paga Prezzo Fisso -->
    {#if payMode === 'fixed'}
      <div class="mb-4">
        <label for="fixedPrice" class="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('fixedAmount')}:</label>
        <input
          type="number"
          bind:value={fixedPrice}
          id="fixedPrice"
          min="0"
          step="5"
          class="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
        />
      </div>
    {/if}

    <!-- Extra / Mance -->
    <div class="mb-4">
      <label for="extraEarnings" class="mb-1.5 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">{$t('extraEarnings')}:</label>
      <input
        type="number"
        bind:value={extraEarnings}
        id="extraEarnings"
        min="0"
        step="1"
        placeholder="0"
        class="w-full rounded-xl border border-gray-300 p-2.5 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>

    <!-- Fasce Orarie -->
    <div class="mb-5 border-t pt-4 dark:border-slate-800">
      <span class="mb-3 block text-xs font-extrabold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {$t('timeSlotsText')}
      </span>
      
      {#each fasceOrarie as fascia, index}
        <div class="mb-3 grid grid-cols-3 gap-2.5 items-end">
          <div>
            <label for={`inizio-${index}`} class="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1">{$t('start')}:</label>
            <input
              type="time"
              bind:value={fascia.start}
              id={`inizio-${index}`}
              step="900"
              class="w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
            />
          </div>
          <div>
            <label for={`fine-${index}`} class="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 mb-1">{$t('end')}:</label>
            <input
              type="time"
              bind:value={fascia.end}
              id={`fine-${index}`}
              class="w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
              step="900"
            />
          </div>
          <div>
            <button
              type="button"
              onclick={() => rimuoviFasciaOraria(index)}
              class="w-full rounded-xl bg-red-600 py-2 font-bold text-sm text-white hover:bg-red-700 active:scale-95 transition shadow-sm"
            >
              {$t('remove')}
            </button>
          </div>
        </div>
      {/each}

      <button
        onclick={() => aggiungiFasciaOraria()}
        type="button"
        class="mt-2 text-xs text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 font-extrabold uppercase tracking-wider transition"
      >
        {$t('addTimeSlot')}
      </button>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-3 mt-6 border-t pt-4 dark:border-slate-800">
      {#if $editingDay}
        <button
          type="button"
          class="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition active:scale-95 mr-auto"
          onclick={eliminaGiornoCorrente}
        >
          {$t('deleteDay')}
        </button>
      {/if}
      <button
        type="button"
        class="rounded-xl border px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-750 dark:text-gray-300 dark:hover:bg-slate-800 transition active:scale-95"
        onclick={toggleAggiungi}
      >
        {$t('cancel')}
      </button>
      <button
        type="submit"
        class="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white hover:bg-green-700 shadow-md active:scale-95 transition"
      >
        {$editingDay ? $t('saveChanges') : $t('saveShift')}
      </button>
    </div>
  </form>
</div>
