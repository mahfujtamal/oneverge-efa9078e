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

interface PasswordResetProps {
  name?: string
  resetUrl?: string
  ttlMinutes?: number
}

const PasswordResetEmail = ({
  name,
  resetUrl,
  ttlMinutes = 30,
}: PasswordResetProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your {SITE_NAME} password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'}
        </Text>
        <Text style={text}>
          We received a request to reset the password for your {SITE_NAME}{' '}
          account. Click the button below to choose a new password. This link
          will expire in {ttlMinutes} minutes.
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={resetUrl} style={button}>
            Reset password
          </Button>
        </Section>

        <Text style={smallText}>
          Or copy and paste this link into your browser:
          <br />
          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>
        </Text>

        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email — your password will not change.
        </Text>

        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PasswordResetEmail,
  subject: `Reset your ${SITE_NAME} password`,
  displayName: 'Password reset',
  previewData: {
    name: 'Rahim',
    resetUrl: 'https://oneverge.lovable.app/reset-password?token=sample',
    ttlMinutes: 30,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: '700',
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const smallText = {
  fontSize: '13px',
  color: '#64748b',
  lineHeight: '1.5',
  margin: '16px 0',
  wordBreak: 'break-all' as const,
}
const button = {
  backgroundColor: '#06b6d4',
  color: '#ffffff',
  padding: '12px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600',
  textDecoration: 'none',
  display: 'inline-block',
}
const link = {
  color: '#06b6d4',
  textDecoration: 'underline',
}
const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  lineHeight: '1.5',
  margin: '24px 0 0',
}
