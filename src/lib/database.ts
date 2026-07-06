import { writable } from 'svelte/store'
import { openDB, type IDBPDatabase } from 'idb'
import type { MyDB, TimeSlot, WorkedDay, PaymentHistory, Company } from '../types'
import { ErrorResponse, SuccessResponse } from './logger'
import { addDays, differenceInHours, parse, format } from 'date-fns'
import { calculateTotalHours, calculateDailyEarnings } from '$lib/utils/timeTrackingUtils'

class DatabaseManager {
  _workedDays = writable<WorkedDay[]>([])
  dbPromise!: Promise<IDBPDatabase<MyDB>>

  constructor() {}

  async startDatabase() {
    try {
      this.dbPromise = this.initializeDB();
      const db = await this.dbPromise;
      console.log("[DEBUG] Database initialized successfully");
      
      // Seed default company if it doesn't exist
      const defaultCompany = await db.get('companies', 'default');
      if (!defaultCompany) {
        await db.put('companies', {
          id: 'default',
          name: 'Azienda Standard (Default)',
          hourlyWage: 10,
          customSettings: [
            { id: 'viaggio', name: 'Viaggio', amount: 20 },
            { id: 'macchina', name: 'Con la tua macchina', amount: 40 }
          ]
        });
        console.log("[DEBUG] Seeded default company");
      }

      // Load days into reactive store
      const allDays = await this.getWorkedDays();
      this._workedDays.set(allDays);
    } catch (e) {
      console.error("[DEBUG] Database initialization failed:", e);
      throw e;
    }
  }

  async addWorkedDay(workedDay: WorkedDay) {
    const db = await this.dbPromise

    if (!db) {
      new ErrorResponse(
        'No database loaded. You should call startDatabase() first.'
      )
      return
    }
    try {
      // Strip Svelte 5 state proxies to avoid DataCloneError
      const cleanWorkedDay = JSON.parse(JSON.stringify(workedDay))
      cleanWorkedDay.date = new Date(cleanWorkedDay.date)

      const tx = db.transaction('workedDays', 'readwrite')
      const store = tx.objectStore('workedDays')
      const key = format(cleanWorkedDay.date, 'yyyy-MM-dd')
      await store.put(cleanWorkedDay, key)
      new SuccessResponse(`Successfully added clean workedDay with key ${key}`)
      await tx.done
      
      // Reload days to trigger reactivity with a new array reference
      const allDays = await this.getWorkedDays();
      this._workedDays.set(allDays);
    } catch (error: any) {
      new ErrorResponse(error)
      throw error;
    }
  }

  async getWorkedDays(asc?: boolean) {
    const db = await this.dbPromise
    if (!db) {
      return
    }
    const workedDays = await db.getAll('workedDays')
    // console.log(workedDays)
    if (!workedDays) return []

    const sortedResult = workedDays.sort((a, b) =>
      asc
        ? a.date.getTime() - b.date.getTime()
        : b.date.getTime() - a.date.getTime()
    )

    return sortedResult
  }

  getBaseWage() {
    return 10
  }

  async getHoursWorkedMonth(month: Date): Promise<number> {
    const db = await this.dbPromise
    const tx = db.transaction('workedDays', 'readonly')
    const store = tx.objectStore('workedDays')
    const index = store.index('date')

    // Get first and last day of the month
    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const lastDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    const range = IDBKeyRange.bound(firstDayOfMonth, lastDayOfMonth)

    let totalWorked = 0
    const allDaysWorked = await index.getAll(range)
    console.log(allDaysWorked)

    for (const day of allDaysWorked) {
      totalWorked += calculateTotalHours(day.timeSlots)
    }
    return totalWorked
  }

  async deleteWorkedDay(workedDay: WorkedDay) {
    const db = await this.dbPromise
    const tx = db.transaction('workedDays', 'readwrite')
    const store = tx.objectStore('workedDays')
    await store.delete(format(workedDay.date, 'yyyy-MM-dd'))
    await tx.done
    
    // Reload days to trigger reactivity with a new array reference
    const allDays = await this.getWorkedDays();
    this._workedDays.set(allDays);
  }

  calculateTimeSlot(timeSlot: TimeSlot): number {
    const startDate = new Date()
    const startTime = parse(timeSlot.start, 'HH:mm', startDate)
    const endTime = parse(timeSlot.end, 'HH:mm', startDate)

    const hoursWorked = differenceInHours(endTime, startTime)
    if (hoursWorked < 0) {
      const newEndTime = parse(timeSlot.end, 'HH:mm', addDays(startDate, 1))
      return differenceInHours(newEndTime, startTime)
    }
    return hoursWorked
  }

  async getWorkWithTravelOfMonth(month: Date) {
    const db = await this.dbPromise
    const tx = db.transaction('workedDays', 'readonly')
    const store = tx.objectStore('workedDays')
    const index = store.index('date')

    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const lastDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    const range = IDBKeyRange.bound(firstDayOfMonth, lastDayOfMonth)

    let totalTravel = 0
    const allDaysWorked = await index.getAll(range)
    for (const day of allDaysWorked) {
      totalTravel += day.travel ? 1 : 0
    }
    return totalTravel
  }

  async getCarUsageOfMonth(month: Date) {
    const db = await this.dbPromise
    const tx = db.transaction('workedDays', 'readonly')
    const store = tx.objectStore('workedDays')
    const index = store.index('date')

    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const lastDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    const range = IDBKeyRange.bound(firstDayOfMonth, lastDayOfMonth)

    let totalCarUsage = 0
    const allDaysWorked = await index.getAll(range)
    for (const day of allDaysWorked) {
      totalCarUsage += day.carUsage ? 40 : 0
    }
    return totalCarUsage
  }

  async getTotalCompensationOfMouth(month: Date): Promise<number> {
    const db = await this.dbPromise
    if (!db) return 0
    const tx = db.transaction('workedDays', 'readonly')
    const store = tx.objectStore('workedDays')
    const index = store.index('date')

    const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    const lastDayOfMonth = new Date(
      month.getFullYear(),
      month.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    )

    const range = IDBKeyRange.bound(firstDayOfMonth, lastDayOfMonth)
    const allDaysWorked = await index.getAll(range)

    let total = 0
    for (const day of allDaysWorked) {
      total += calculateDailyEarnings(day)
    }
    return total
  }

  async getPaymentHistory() {
    const db = await this.dbPromise
    const tx = db.transaction('monthlyPayments', 'readonly')
    const store = tx.objectStore('monthlyPayments')
    return store.getAll()
  }

  async getSinglePaymentHistory(id: string) {
    const db = await this.dbPromise
    const tx = db.transaction('monthlyPayments', 'readonly')
    const store = tx.objectStore('monthlyPayments')
    return store.get(id)
  }

  async updatePaymentHistory(key: string, val: number) {
    const db = await this.dbPromise
    const tx = db.transaction('monthlyPayments', 'readwrite')
    const store = tx.objectStore('monthlyPayments')
    if (!store) throw Error('Error in the database')
    const paymentRecord: PaymentHistory = {
      monthYear: key,
      payment: val
    }
    return await store.put(paymentRecord)
  }

  async getCompanies(): Promise<Company[]> {
    const db = await this.dbPromise
    if (!db) return []
    return db.getAll('companies')
  }

  async addCompany(company: Company) {
    const db = await this.dbPromise
    if (!db) return
    try {
      // Strip Svelte 5 state proxies to avoid DataCloneError
      const cleanCompany = JSON.parse(JSON.stringify(company))

      const tx = db.transaction('companies', 'readwrite')
      const store = tx.objectStore('companies')
      await store.put(cleanCompany)
      await tx.done
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async deleteCompany(id: string) {
    const db = await this.dbPromise
    if (!db) return
    const tx = db.transaction('companies', 'readwrite')
    const store = tx.objectStore('companies')
    await store.delete(id)
    await tx.done
  }

  private async initializeDB(): Promise<IDBPDatabase<MyDB>> {
    return openDB<MyDB>('MyDB', 6, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log('qui')

        if (!db.objectStoreNames.contains('workedDays')) {
          const workedDaysStore = db.createObjectStore('workedDays')
          workedDaysStore.createIndex('date', 'date')
        }
        if (!db.objectStoreNames.contains('baseWage')) {
          db.createObjectStore('baseWage')
          transaction.objectStore('baseWage').put(10, 'main')
        }
        if (!db.objectStoreNames.contains('travel')) {
          db.createObjectStore('travel')
          transaction.objectStore('travel').put(2, 'main')
        }
        if (!db.objectStoreNames.contains('monthlyPayments')) {
          const monthlyPaymentsStore = db.createObjectStore('monthlyPayments', {
            keyPath: 'monthYear'
          })
          monthlyPaymentsStore.createIndex('monthYear', 'monthYear', {
            unique: false
          })
        }
        if (!db.objectStoreNames.contains('companies')) {
          db.createObjectStore('companies', { keyPath: 'id' })
        }

        // Check if the old object store exists before trying to access it
        if (db.objectStoreNames.contains('giorni_lavorati' as any)) {
          const giorniLavoratiStore = (transaction as any).objectStore('giorni_lavorati')
          console.log('qui')

          giorniLavoratiStore
            .openCursor()
            .then(function processCursor(cursor: any) {
              if (!cursor) {
                console.log('No more entries!')
                return
              }

              const record = cursor.value as any
              const newTimeSlots: TimeSlot[] = record.fasce_orarie.map(
                (element: any) => ({
                  start: element.inizio,
                  end: element.fine
                })
              )

              const newRecord: WorkedDay = {
                date: record.giorno,
                timeSlots: newTimeSlots,
                travel: record.viaggio,
                carUsage: record.yourCar
              }

              const key = format(newRecord.date, 'yyyy-MM-dd')
              const newStore = transaction.objectStore('workedDays')

              newStore
                .put(newRecord, key)
                .then(() => {
                  cursor
                    .delete()
                    .then(() => {
                      cursor.continue().then(processCursor)
                    })
                    .catch((error: any) => {
                      console.error('Error deleting old record:', error)
                    })
                })
                .catch((error: any) => {
                  console.error('Error adding new record:', error)
                })
            })
            .catch((error: any) => {
              console.error('Error opening cursor:', error)
            })
        }
      },
      blocked(currentVersion, blockedVersion, event) {
        console.warn('[DEBUG] openDB is BLOCKED! Please close other tabs. Current:', currentVersion, 'Blocked:', blockedVersion);
        alert("AGGIORNAMENTO BLOCCATO: Hai un'altra scheda o finestra di questa app aperta. Per favore, chiudi tutte le altre schede per permettere l'aggiornamento del database, poi ricarica la pagina.");
      },
      blocking(currentVersion, blockedVersion, event) {
        console.warn('[DEBUG] openDB is BLOCKING. Current:', currentVersion, 'Blocked:', blockedVersion);
      },
      terminated() {
        console.error('[DEBUG] openDB was terminated unexpectedly.');
        alert("Il database è stato terminato inaspettatamente.");
      }
    })
  }
}

const DB = new DatabaseManager()

export { DB, type DatabaseManager }
