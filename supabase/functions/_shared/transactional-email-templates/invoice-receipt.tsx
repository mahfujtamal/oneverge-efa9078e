/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'OneVerge'
const ACCENT = '#06b6d4'
const NAVY = '#0f172a'

interface InvoiceReceiptProps {
  name?: string
  transactionId?: string
  amount?: string
  paymentMethod?: string
  paymentType?: string
  invoiceUrl?: string
  walletBalance?: string
}

const InvoiceReceiptEmail = ({
  name,
  transactionId,
  amount,
  paymentMethod,
  paymentType,
  invoiceUrl,
  walletBalance,
}: InvoiceReceiptProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your {SITE_NAME} payment receipt {transactionId ? `(${transactionId})` : ''}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Heading style={brandText}>ONEVERGE</Heading>
          <Text style={brandSub}>Payment Receipt</Text>
        </Section>

        <Heading style={h1}>
          {name ? `Thanks, ${name}!` : 'Thanks for your payment!'}
        </Heading>
        <Text style={text}>
          We have received your payment{paymentType ? ` for ${paymentType}` : ''}.
          Your invoice is attached as a PDF below.
        </Text>

        <Section style={metaBox}>
          {transactionId ? (
            <Text style={metaRow}>
              <span style={metaLabel}>Transaction ID:&nbsp;</span>
              <span style={metaValue}>{transactionId}</span>
            </Text>
          ) : null}
          {amount ? (
            <Text style={metaRow}>
              <span style={metaLabel}>Amount paid:&nbsp;</span>
              <span style={metaValue}>{amount}</span>
            </Text>
          ) : null}
          {paymentMethod ? (
            <Text style={metaRow}>
              <span style={metaLabel}>Method:&nbsp;</span>
              <span style={metaValue}>{paymentMethod}</span>
            </Text>
          ) : null}
          {walletBalance ? (
            <Text style={metaRow}>
              <span style={metaLabel}>Wallet balance:&nbsp;</span>
              <span style={metaValue}>{walletBalance}</span>
            </Text>
          ) : null}
        </Section>

        {invoiceUrl ? (
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={invoiceUrl} style={button}>
              Download PDF Invoice
            </Button>
            <Text style={muted}>
              Or copy this link:{' '}
              <Link href={invoiceUrl} style={{ color: ACCENT }}>
                {invoiceUrl}
              </Link>
            </Text>
          </Section>
        ) : null}

        <Text style={footer}>
          This receipt was generated automatically. If you did not authorise this
          payment, please contact {SITE_NAME} support immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceReceiptEmail,
  subject: (data: Record<string, any>) =>
    `Your ${SITE_NAME} payment receipt${data?.transactionId ? ` — ${data.transactionId}` : ''}`,
  displayName: 'Invoice receipt',
  previewData: {
    name: 'Jane',
    transactionId: 'OV-TXN-SUBSC-1234',
    amount: '৳ 1,400',
    paymentMethod: 'bKash',
    paymentType: 'Wallet Top-up',
    walletBalance: '৳ 2,200.00',
    invoiceUrl: 'https://example.com/invoices/sample.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '0 0 24px', maxWidth: '560px', margin: '0 auto' }
const brandBar = {
  backgroundColor: NAVY,
  padding: '20px 25px',
  textAlign: 'left' as const,
}
const brandText = {
  color: ACCENT,
  fontSize: '20px',
  fontWeight: 'bold' as const,
  margin: 0,
  letterSpacing: '2px',
}
const brandSub = {
  color: '#ffffff',
  fontSize: '11px',
  margin: '4px 0 0',
  letterSpacing: '1px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '24px 25px 14px',
}
const text = { fontSize: '14px', color: '#4a5568', lineHeight: '1.5', margin: '0 25px 18px' }
const metaBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '0 25px',
}
const metaRow = { fontSize: '13px', color: '#1a202c', margin: '4px 0' }
const metaLabel = { color: '#64748b', fontWeight: 'bold' as const }
const metaValue = { color: '#0f172a' }
const button = {
  backgroundColor: NAVY,
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '1px',
}
const muted = { fontSize: '11px', color: '#94a3b8', margin: '14px 25px 0' }
const footer = {
  fontSize: '11px',
  color: '#94a3b8',
  margin: '30px 25px 0',
  borderTop: '1px solid #f1f5f9',
  paddingTop: '14px',
}
