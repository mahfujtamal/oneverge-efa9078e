/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as passwordReset } from './password-reset.tsx'
import { template as invoiceReceipt } from './invoice-receipt.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'password-reset': passwordReset,
  'invoice-receipt': invoiceReceipt,
}
