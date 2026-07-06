<script lang="ts">
  import { onMount } from 'svelte'
  import { format, getMonth } from 'date-fns'
  import {
    calculateTotalHours,
    calculateDailyEarnings
  } from '$lib/utils/timeTrackingUtils'
  import type { WorkedDay, Company } from '../types'
  import { DB } from '$lib/database'
  import { toasts } from '$lib/toast'

  let workedDays: WorkedDay[] = $state([])
  let companies: Company[] = $state([])

  DB._workedDays.subscribe(async () => {
    workedDays = (await DB.getWorkedDays()) ?? []
    workedDays.sort((a, b) => b.date.getTime() - a.date.getTime())
  })

  onMount(async () => {
    companies = await DB.getCompanies()
  })

  let editandoIndex = $state(-1)
  let editDate = $state(-1)
  let giornoPerFasce = $state(-1)
  let editingGiorno = $state<WorkedDay | null>(null)
  let originalDateStr = $state('')
  let editDateString = $state('')

  $effect(() => {
    if (editingGiorno && editDateString) {
      editingGiorno.date = new Date(editDateString)
    }
  })

  function modificaFasciaOraria(index: number, giorno: number) {
    editandoIndex = index
    giornoPerFasce = giorno
  }

  function modificaData(index: number) {
    editDate = index
    // Deep clone the day object to avoid mutating workedDays directly before saving
    editingGiorno = JSON.parse(JSON.stringify(workedDays[index]))
    if (editingGiorno) {
      const dateObj = new Date(editingGiorno.date)
      editDateString = format(dateObj, 'yyyy-MM-dd')
      originalDateStr = editDateString
    }
  }

  async function deleteWorkedDay(workedDay: WorkedDay) {
    const formattedDate = format(workedDay.date, 'dd/MM/yyyy')
    if (confirm(`Sei sicuro di voler eliminare definitivamente questo giorno lavorato (${formattedDate})?`)) {
      try {
        await DB.deleteWorkedDay(workedDay)
        toasts.show(`Giorno lavorato del ${formattedDate} eliminato! 🗑️`, "success")
        editDate = -1
        editingGiorno = null
        workedDays = (await DB.getWorkedDays()) ?? []
      } catch (e: any) {
        toasts.show("Errore durante l'eliminazione: " + (e.message || String(e)), "error")
      }
    }
  }

  async function salvaModifiche(giorno: WorkedDay) {
    if (!giorno) return
    
    // Ensure date is updated from the string input
    if (editDateString) {
      giorno.date = new Date(editDateString)
    } else if (typeof giorno.date === 'string') {
      giorno.date = new Date(giorno.date)
    }

    const newKey = format(giorno.date, 'yyyy-MM-dd')
    if (originalDateStr && originalDateStr !== newKey) {
      // Delete old record with the previous date to prevent duplication
      const oldWorkedDay = { date: new Date(originalDateStr) } as WorkedDay
      await DB.deleteWorkedDay(oldWorkedDay)
    }

    await DB.addWorkedDay(giorno)

    editandoIndex = -1
    editDate = -1
    giornoPerFasce = -1
    editingGiorno = null
    originalDateStr = ''
    editDateString = ''
  }
</script>

<div>
  <p class="text-xs text-gray-500 mb-4">
    Tip: clicca sulla data per modificare l'azienda e il tipo di pagamento, oppure clicca sulle fasce orarie per modificarne l'orario.
  </p>

  {#each workedDays as giorno, idx}
    {@const displayGiorno = (idx === editDate && editingGiorno) ? editingGiorno : giorno}
    {#if !workedDays[idx - 1] || getMonth(workedDays[idx - 1].date) != getMonth(workedDays[idx].date)}
      <div class="mb-2 mt-6 p-2">
        <span class="text-xl font-semibold capitalize">{format(giorno.date, 'MMMM yy')}</span>
        <hr class="mt-1 dark:border-slate-800" />
      </div>
    {/if}

    <div
      class="mb-4 flex flex-col sm:flex-row bg-white p-4 shadow-sm rounded-2xl border dark:border-slate-800 dark:bg-slate-900 dark:text-white hover:shadow-md transition gap-4 sm:gap-0"
    >
      <div class="flex-1">
        <div class="flex items-center justify-between rounded-lg">
          <div class="w-full">
            {#if idx !== editDate}
              <div class="flex flex-col gap-1 mb-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <button
                    class="block text-left text-sm font-semibold text-gray-800 dark:text-white hover:underline focus:outline-none"
                    onclick={() => modificaData(idx)}
                  >
                    {format(giorno.date, 'iiii d/M/y')}
                  </button>
                  {#if giorno.companyName}
                    <span class="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium dark:bg-blue-900 dark:text-blue-200">
                      {giorno.companyName}
                    </span>
                  {/if}
                  {#if giorno.payMode === 'fixed'}
                    <span class="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium dark:bg-purple-900 dark:text-purple-200">
                      Fisso
                    </span>
                  {/if}
                </div>

                <span class="block text-xs font-light text-gray-500 dark:text-gray-300">
                  Ore lavorate: <strong>{calculateTotalHours(giorno.timeSlots)}</strong>
                </span>

                {#if giorno.payMode === 'fixed'}
                  <span class="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                    Tariffa fissa: €{giorno.fixedPrice}
                  </span>
                {:else}
                  <div class="flex flex-wrap gap-2 text-xs mt-1.5">
                    {#if giorno.customSettings && giorno.customSettings.length > 0}
                      {#each giorno.customSettings as setting}
                        <button
                          class="hover:underline text-left focus:outline-none bg-gray-50 dark:bg-slate-850 px-2 py-0.5 rounded border dark:border-slate-800"
                          onclick={() => {
                            setting.active = !setting.active
                            salvaModifiche(giorno)
                          }}
                        >
                          {setting.name}: <strong class={setting.active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>{setting.active ? 'Sì' : 'No'}</strong>
                        </button>
                      {/each}
                    {:else}
                      <button
                        class="hover:underline text-left focus:outline-none"
                        onclick={() => {
                          giorno.travel = !giorno.travel
                          salvaModifiche(giorno)
                        }}
                      >
                        Viaggio: <strong>{giorno.travel ? 'Sì' : 'No'}</strong>
                      </button>

                      <button
                        class="hover:underline text-left focus:outline-none ml-3"
                        onclick={() => {
                          giorno.carUsage = !giorno.carUsage
                          salvaModifiche(giorno)
                        }}
                      >
                        Macchina: <strong>{giorno.carUsage ? 'Sì' : 'No'}</strong>
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else}
              <!-- Edit form for date, company, payment options -->
              {#if editingGiorno}
                <div class="mb-4 flex flex-col gap-3 rounded-md border p-3 bg-gray-50 dark:border-slate-800 dark:bg-slate-950">
                  <div>
                    <label for={`edit-date-${idx}`} class="block text-xs font-bold text-gray-700 dark:text-gray-300">Data:</label>
                    <input
                      type="date"
                      id={`edit-date-${idx}`}
                      bind:value={editDateString}
                      class="mt-1 block w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label for={`edit-company-${idx}`} class="block text-xs font-bold text-gray-700 dark:text-gray-300">Azienda:</label>
                    <select
                      id={`edit-company-${idx}`}
                      value={editingGiorno.companyId || ''}
                      onchange={(e) => {
                        const cid = e.currentTarget.value;
                        editingGiorno!.companyId = cid || undefined;
                        const found = companies.find(c => c.id === cid);
                        editingGiorno!.companyName = found?.name || undefined;
                        if (editingGiorno!.payMode !== 'fixed') {
                          editingGiorno!.hourlyWage = found?.hourlyWage ?? 10;
                          if (found && found.customSettings && found.customSettings.length > 0) {
                            editingGiorno!.customSettings = found.customSettings.map(cs => ({
                              id: cs.id,
                              name: cs.name,
                              amount: cs.amount,
                              active: true
                            }));
                            editingGiorno!.travel = false;
                            editingGiorno!.carUsage = false;
                          } else {
                            editingGiorno!.customSettings = undefined;
                            editingGiorno!.travelRate = 20;
                            editingGiorno!.carAllowance = 40;
                          }
                        } else {
                          editingGiorno!.customSettings = undefined;
                        }
                      }}
                      class="mt-1 block w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="">Nessuna azienda</option>
                      {#each companies as comp}
                        <option value={comp.id}>{comp.name}</option>
                      {/each}
                    </select>
                  </div>
                  <div>
                    <label for={`edit-paymode-${idx}`} class="block text-xs font-bold text-gray-700 dark:text-gray-300">Tipologia Pagamento:</label>
                    <select
                      id={`edit-paymode-${idx}`}
                      value={editingGiorno.payMode || 'hourly'}
                      onchange={(e) => {
                        const mode = e.currentTarget.value as 'hourly' | 'fixed';
                        editingGiorno!.payMode = mode;
                        if (mode === 'fixed') {
                          editingGiorno!.fixedPrice = editingGiorno!.fixedPrice ?? 0;
                          editingGiorno!.customSettings = undefined;
                        } else if (mode === 'hourly') {
                          const found = companies.find(c => c.id === editingGiorno!.companyId);
                          editingGiorno!.hourlyWage = found?.hourlyWage ?? 10;
                          if (found && found.customSettings && found.customSettings.length > 0) {
                            editingGiorno!.customSettings = found.customSettings.map(cs => ({
                              id: cs.id,
                              name: cs.name,
                              amount: cs.amount,
                              active: true
                            }));
                            editingGiorno!.travel = false;
                            editingGiorno!.carUsage = false;
                          } else {
                            editingGiorno!.customSettings = undefined;
                            editingGiorno!.travelRate = 20;
                            editingGiorno!.carAllowance = 40;
                          }
                        }
                      }}
                      class="mt-1 block w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    >
                      <option value="hourly">Ore + Rimborsi</option>
                      <option value="fixed">Prezzo Fisso (Flat)</option>
                    </select>
                  </div>
                  
                  {#if editingGiorno.payMode === 'fixed'}
                    <div>
                      <label for={`edit-price-${idx}`} class="block text-xs font-bold text-gray-700 dark:text-gray-300">Prezzo Fisso (€):</label>
                      <input
                        type="number"
                        id={`edit-price-${idx}`}
                        bind:value={editingGiorno.fixedPrice}
                        class="mt-1 block w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-bold"
                      />
                    </div>
                  {/if}

                  {#if editingGiorno.payMode === 'hourly'}
                    {#if editingGiorno.customSettings && editingGiorno.customSettings.length > 0}
                      <div class="flex flex-col gap-2 border-t pt-2.5 dark:border-slate-850">
                        <span class="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Rimborsi Attivi:</span>
                        {#each editingGiorno.customSettings as setting}
                          <label class="flex items-center gap-2.5 text-xs font-bold cursor-pointer text-gray-700 dark:text-gray-300">
                            <input type="checkbox" bind:checked={setting.active} class="h-4 w-4 rounded-lg text-green-600 focus:ring-green-500 cursor-pointer" />
                            {setting.name} ({setting.amount}€)
                          </label>
                        {/each}
                      </div>
                    {/if}
                  {/if}

                  <div class="mt-2 border-t pt-2.5 dark:border-slate-850">
                    <label for={`edit-extra-${idx}`} class="block text-xs font-bold text-gray-700 dark:text-gray-300">Entrate Extra (Mance, ecc...):</label>
                    <input
                      type="number"
                      id={`edit-extra-${idx}`}
                      bind:value={editingGiorno.extraEarnings}
                      min="0"
                      step="1"
                      class="mt-1 block w-full rounded-xl border border-gray-300 p-2 text-sm text-gray-900 shadow-sm focus:border-green-500 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </div>

                  <div class="flex gap-2 items-center justify-between mt-4 pt-2.5 border-t dark:border-slate-850">
                    <button
                      type="button"
                      class="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition active:scale-95"
                      onclick={() => deleteWorkedDay(editingGiorno!)}
                    >
                      Elimina Giorno
                    </button>
                    
                    <div class="flex gap-2">
                      <button
                        type="button"
                        class="rounded-xl border px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-750 dark:text-gray-300 dark:hover:bg-slate-800 transition active:scale-95"
                        onclick={() => { editDate = -1; editingGiorno = null; originalDateStr = ''; editDateString = ''; }}
                      >
                        Annulla
                      </button>
                      <button
                        type="button"
                        class="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 transition active:scale-95"
                        onclick={() => salvaModifiche(editingGiorno!)}
                      >
                        Salva
                      </button>
                    </div>
                  </div>
                </div>
              {/if}
            {/if}
          </div>
        </div>

        <!-- Time slots -->
        <div class="mt-3 flex flex-wrap gap-2">
          {#each giorno.timeSlots as fascia, index}
            <div class="flex items-center gap-2">
              {#if editandoIndex !== index || giornoPerFasce !== idx}
                <button
                  onclick={() => modificaFasciaOraria(index, idx)}
                  class="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-2.5 py-1 rounded text-gray-700 dark:text-gray-300 border dark:border-slate-750 font-mono"
                >
                  🕒 {fascia.start} - {fascia.end}
                </button>
              {:else}
                <!-- Time slot inputs during editing -->
                <div class="flex items-center gap-1.5 flex-wrap bg-gray-50 dark:bg-slate-950 p-2.5 rounded-xl border dark:border-slate-850">
                  <input
                    type="time"
                    class="rounded-lg border border-gray-300 p-1 text-xs text-gray-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    bind:value={fascia.start}
                  />
                  <span class="text-xs">-</span>
                  <input
                    type="time"
                    class="rounded-lg border border-gray-300 p-1 text-xs text-gray-900 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white font-mono"
                    bind:value={fascia.end}
                  />
                  <div class="flex gap-1.5 mt-1 sm:mt-0">
                    <button
                      class="rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 active:scale-95 transition"
                      onclick={() => salvaModifiche(giorno)}
                    >
                      Salva
                    </button>
                    <button
                      class="rounded-lg bg-red-650 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-750 active:scale-95 transition"
                      onclick={() => {
                        giorno.timeSlots.splice(index, 1)
                        salvaModifiche(giorno)
                      }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>

        <div class="mt-4 flex gap-2">
          <button
            onclick={() => deleteWorkedDay(giorno)}
            class="rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition active:scale-95"
          >
            Elimina Giorno
          </button>
        </div>
      </div>

      <!-- Financial breakdown column -->
      <div class="border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4 flex flex-col justify-between dark:border-slate-800 text-left sm:text-right min-w-[160px]">
        <div class="flex flex-col text-green-600 dark:text-green-400 text-xs gap-0.5 font-mono">
          {#if displayGiorno.payMode === 'fixed'}
            <span class="font-sans font-extrabold text-gray-600 dark:text-gray-300">Paga Fissa</span>
            <span class="text-sm font-bold">€ {displayGiorno.fixedPrice}</span>
          {:else}
            {@const wage = displayGiorno.hourlyWage ?? 10}
            <span class="font-sans font-extrabold text-gray-600 dark:text-gray-300">Dettaglio Paga</span>
            <span>Ore: € {calculateTotalHours(displayGiorno.timeSlots) * wage} ({wage}€/h)</span>
            {#if displayGiorno.customSettings && displayGiorno.customSettings.length > 0}
              {#each displayGiorno.customSettings as setting}
                {#if setting.active}
                  <span>{setting.name}: +€ {setting.amount}</span>
                {/if}
              {/each}
            {:else}
              {@const travelRate = displayGiorno.travelRate ?? 20}
              {@const carAllowance = displayGiorno.carAllowance ?? 40}
              {#if displayGiorno.travel}
                <span>Viaggio: +€ {travelRate}</span>
              {/if}
              {#if displayGiorno.carUsage}
                <span>Macchina: +€ {carAllowance}</span>
              {/if}
            {/if}
          {/if}
          {#if displayGiorno.extraEarnings}
            <span>Extra: +€ {displayGiorno.extraEarnings}</span>
          {/if}
        </div>
        <div class="mt-3 sm:mt-auto pt-2 border-t dark:border-slate-800 flex sm:block justify-between items-center">
          <span class="text-[10px] text-gray-500 dark:text-gray-400 font-sans uppercase font-black">Totale Giorno</span>
          <span class="text-lg font-black text-green-600 dark:text-green-400 block sm:inline">
            € {calculateDailyEarnings(displayGiorno)}
          </span>
        </div>
      </div>
    </div>
  {/each}
</div>
