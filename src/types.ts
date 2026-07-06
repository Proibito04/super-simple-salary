import type { DBSchema } from 'idb'

export interface CustomSetting {
  id: string
  name: string
  amount: number
}

export interface ActiveCustomSetting {
  id: string
  name: string
  amount: number
  active: boolean
}

export interface Company {
  id: string
  name: string
  hourlyWage: number
  customSettings?: CustomSetting[]
}

export interface WorkedDay {
  date: Date
  timeSlots: TimeSlot[]
  travel: boolean
  carUsage: boolean
  companyId?: string
  companyName?: string
  payMode?: 'hourly' | 'fixed'
  fixedPrice?: number
  hourlyWage?: number
  travelRate?: number
  carAllowance?: number
  customSettings?: ActiveCustomSetting[]
  extraEarnings?: number
}

export interface TimeSlot {
  start: string
  end: string
}

export interface PaymentHistory {
  monthYear: string
  payment: number
}

export interface MyDB extends DBSchema {
  workedDays: {
    value: WorkedDay
    key: string
    indexes: { date: Date }
  }
  baseWage: {
    key: string
    value: number
  }
  travel: {
    key: string
    value: number
  }
  monthlyPayments: {
    key: string
    value: PaymentHistory
    indexes: { monthYear: string }
  }
  companies: {
    key: string
    value: Company
  }
}

export interface DetailedWage {
  totalHours: number
  totalTravel: number
  dailyAllowance: number
  totalFixedPay: number
  hourlyEarnings: number
  totalReimbursement: number
  totalExtraEarnings: number
}
