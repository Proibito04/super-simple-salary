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
  import { editingDay } from '$lib/store'

  let workedDays: WorkedDay[] = $state([])
  let companies: Company[] = $state([])

  DB._workedDays.subscribe(async () => {
    workedDays = (await DB.getWorkedDays()) ?? []
    workedDays.sort((a, b) => b.date.getTime() - a.date.getTime())
  })

  onMount(async () => {
    companies = await DB.getCompanies()
  })

  function modificaData(workedDay: WorkedDay) {
    // Pass a copy of the worked day to avoid polluting the state directly before save
    editingDay.set(JSON.parse(JSON.stringify(workedDay)))
  }

  async function deleteWorkedDay(workedDay: WorkedDay) {
    const formattedDate = format(workedDay.date, 'dd/MM/yyyy')
    if (confirm(`Sei sicuro di voler eliminare definitivamente questo giorno lavorato (${formattedDate})?`)) {
      try {
        await DB.deleteWorkedDay(workedDay)
        toasts.show(`Giorno lavorato del ${formattedDate} eliminato! 🗑️`, "success")
        workedDays = (await DB.getWorkedDays()) ?? []
      } catch (e: any) {
        toasts.show("Errore durante l'eliminazione: " + (e.message || String(e)), "error")
      }
    }
  }

  async function salvaModifiche(giorno: WorkedDay) {
    if (!giorno) return
    try {
      await DB.addWorkedDay(giorno)
    } catch (e: any) {
      toasts.show("Errore durante il salvataggio: " + (e.message || String(e)), "error")
    }
  }
</script>

<div>
  <p class="text-xs text-gray-500 mb-4">
    Tip: clicca sulla data o sul pulsante "Modifica" per modificare il giorno, le aziende, le indennità e le fasce orarie.
  </p>

  {#each workedDays as giorno, idx}
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
            <div class="flex flex-col gap-1 mb-2">
              <div class="flex items-center gap-2 flex-wrap">
                <button
                  class="block text-left text-sm font-semibold text-gray-800 dark:text-white hover:underline focus:outline-none"
                  onclick={() => modificaData(giorno)}
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
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        </div>

        <!-- Time slots -->
        <div class="mt-3 flex flex-wrap gap-2 items-center">
          {#each giorno.timeSlots as fascia}
            <button
              onclick={() => modificaData(giorno)}
              class="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-750 px-2.5 py-1 rounded text-gray-700 dark:text-gray-300 border dark:border-slate-750 font-mono"
            >
              🕒 {fascia.start} - {fascia.end}
            </button>
          {/each}
          
          <button
            onclick={() => modificaData(giorno)}
            class="text-xs bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-950/20 dark:hover:bg-green-950/40 dark:text-green-300 px-2.5 py-1 rounded-xl border border-green-200 dark:border-green-900 font-black active:scale-95 transition flex items-center gap-1"
          >
            <span>➕</span> Gestisci Fasce
          </button>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            onclick={() => modificaData(giorno)}
            class="rounded-xl border border-gray-300 dark:border-slate-700 px-3.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition active:scale-95"
          >
            Modifica Giorno
          </button>
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
          {#if giorno.payMode === 'fixed'}
            <span class="font-sans font-extrabold text-gray-600 dark:text-gray-300">Paga Fissa</span>
            <span class="text-sm font-bold">€ {giorno.fixedPrice}</span>
          {:else}
            {@const wage = giorno.hourlyWage ?? 10}
            <span class="font-sans font-extrabold text-gray-600 dark:text-gray-300">Dettaglio Paga</span>
            <span>Ore: € {calculateTotalHours(giorno.timeSlots) * wage} ({wage}€/h)</span>
            {#if giorno.customSettings && giorno.customSettings.length > 0}
              {#each giorno.customSettings as setting}
                {#if setting.active}
                  <span>{setting.name}: +€ {setting.amount}</span>
                {/if}
              {/each}
            {/if}
          {/if}
          {#if giorno.extraEarnings}
            <span>Extra: +€ {giorno.extraEarnings}</span>
          {/if}
        </div>
        <div class="mt-3 sm:mt-auto pt-2 border-t dark:border-slate-800 flex sm:block justify-between items-center">
          <span class="text-[10px] text-gray-500 dark:text-gray-400 font-sans uppercase font-black">Totale Giorno</span>
          <span class="text-lg font-black text-green-600 dark:text-green-400 block sm:inline">
            € {calculateDailyEarnings(giorno)}
          </span>
        </div>
      </div>
    </div>
  {/each}
</div>
