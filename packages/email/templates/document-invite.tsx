import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import type { RecipientRole } from '@prisma/client';
import { OrganisationType } from '@prisma/client';

import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '../components';
import { useBranding } from '../providers/branding';
import { TemplateCustomMessageBody } from '../template-components/template-custom-message-body';
import type { TemplateDocumentInviteProps } from '../template-components/template-document-invite';

export type DocumentInviteEmailTemplateProps = Partial<TemplateDocumentInviteProps> & {
  customBody?: string;
  role: RecipientRole;
  selfSigner?: boolean;
  teamName?: string;
  teamEmail?: string;
  includeSenderDetails?: boolean;
  organisationType?: OrganisationType;
  expiresAt?: Date;
};

export const DocumentInviteEmailTemplate = ({
  inviterName = 'Lucas Smith',
  inviterEmail = 'lucas@documenso.com',
  documentName = 'Open Source Pledge.pdf',
  signDocumentLink = 'https://documenso.com',
  assetBaseUrl = 'http://localhost:3002',
  customBody,
  role,
  selfSigner = false,
  teamName = '',
  includeSenderDetails,
  organisationType,
  expiresAt,
}: DocumentInviteEmailTemplateProps) => {
  const { _ } = useLingui();
  const branding = useBranding();

  const action = _(RECIPIENT_ROLES_DESCRIPTION[role].actionVerb).toLowerCase();

  let previewText = msg`${inviterName} has invited you to ${action} ${documentName}`;

  if (organisationType === OrganisationType.ORGANISATION) {
    previewText = msg`${teamName} has invited you to ${action} ${documentName}`;
  }

  if (selfSigner) {
    previewText = msg`Please ${action} your document ${documentName}`;
  }

  const formattedExpiry = expiresAt
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
        expiresAt,
      )
    : null;

  return (
    <Html>
      <Head />
      <Preview>{_(previewText)}</Preview>

      <Body style={{ backgroundColor: '#f1f5f9', fontFamily: 'sans-serif', margin: 0, padding: 0 }}>
        <Section>
          {/* Top badge */}
          <Container
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              paddingTop: '24px',
              paddingBottom: '12px',
              textAlign: 'left',
            }}
          >
            <Text style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              🔒 This link is unique and secure
            </Text>
          </Container>

          {/* Main card */}
          <Container
            style={{
              maxWidth: '560px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '32px',
            }}
          >
            <Section style={{ width: 'auto', marginBottom: '24px' }}>
              {/* Logo — top center */}
              <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Img
                  src={new URL('/static/glc-logo.svg', assetBaseUrl).toString()}
                  alt="GlobalLegalCheck"
                  height={48}
                  width={53}
                  style={{ margin: '0 auto' }}
                />
                <Text className="m-0 text-sm font-black tracking-[-0.01em] text-slate-900">
                  GlobalLegalCheck
                </Text>
                <Text className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Review the contracts
                </Text>
              </Section>
            </Section>

            <Text
              style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 700, color: '#1a2b4a' }}
            >
              <Trans>Review and Sign Document</Trans>
            </Text>

            <Text style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748b' }}>
              <Trans>
                You have been requested to review and electronically sign the document below.
              </Trans>
            </Text>

            {/* Document info box */}
            <Section
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <Text style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#334155' }}>
                <strong>
                  <Trans>Document:</Trans>
                </strong>{' '}
                {documentName}
              </Text>
              {formattedExpiry && (
                <Text style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                  <strong>
                    <Trans>Expires:</Trans>
                  </strong>{' '}
                  {formattedExpiry}
                </Text>
              )}
            </Section>

            {customBody && (
              <Text style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#475569' }}>
                <TemplateCustomMessageBody text={customBody} />
              </Text>
            )}

            {/* CTA button */}
            <Section style={{ marginBottom: '24px', textAlign: 'center' }}>
              <Button
                href={signDocumentLink}
                style={{
                  backgroundColor: '#007CFA',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '15px',
                  borderRadius: '8px',
                  padding: '14px 48px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                <Trans>Review and Sign Document</Trans>
              </Button>
            </Section>

            <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />

            {/* Security section */}
            <Section>
              <Text
                style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 700, color: '#1a2b4a' }}
              >
                🛡 <Trans>Secure Electronic Signature</Trans>
              </Text>
              <Text style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748b' }}>
                <Trans>
                  Your electronic signature is legally binding and will create a finalized
                  agreement.
                </Trans>
              </Text>
              <Text style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569' }}>
                <span style={{ color: '#007CFA', marginRight: '8px' }}>✓</span>
                <Trans>Encrypted in transit and at rest</Trans>
              </Text>
              <Text style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569' }}>
                <span style={{ color: '#007CFA', marginRight: '8px' }}>✓</span>
                <Trans>Full audit trail and timestamp</Trans>
              </Text>
              <Text style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#475569' }}>
                <span style={{ color: '#007CFA', marginRight: '8px' }}>✓</span>
                <Trans>Compliant with applicable electronic signature regulations</Trans>
              </Text>
              <Text style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                <span style={{ color: '#007CFA', marginRight: '8px' }}>✓</span>
                <Trans>Signed copy automatically delivered to all parties</Trans>
              </Text>
            </Section>
          </Container>

          {/* Sender info */}
          <Container style={{ maxWidth: '560px', margin: '24px auto 0', padding: '0 16px' }}>
            <Text
              style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1a2b4a' }}
            >
              <Trans>Sent by</Trans>
            </Text>
            <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155' }}>
              <Trans>Name:</Trans>{' '}
              <Link
                href={`mailto:${inviterEmail}`}
                style={{ color: '#007CFA', textDecoration: 'none' }}
              >
                {inviterName}
              </Link>
            </Text>
            {organisationType === OrganisationType.ORGANISATION && teamName && (
              <Text style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#334155' }}>
                <Trans>Organization:</Trans> <span style={{ color: '#007CFA' }}>{teamName}</span>
              </Text>
            )}
            <Text style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#334155' }}>
              <Trans>Email:</Trans>{' '}
              <Link
                href={`mailto:${inviterEmail}`}
                style={{ color: '#007CFA', textDecoration: 'none' }}
              >
                {inviterEmail}
              </Link>
            </Text>
            <Text style={{ margin: '0 0 32px 0', fontSize: '13px', color: '#94a3b8' }}>
              <Trans>
                If you were not expecting this request, contact the sender before proceeding.
              </Trans>
            </Text>

            {/* What happens next */}
            <Text
              style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 700, color: '#1a2b4a' }}
            >
              <Trans>What happens next</Trans>
            </Text>
            <Text style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#475569' }}>
              <Trans>Review the full document.</Trans>
            </Text>
            <Text style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#475569' }}>
              <Trans>Confirm your identity if required.</Trans>
            </Text>
            <Text style={{ margin: '0 0 6px 0', fontSize: '14px', color: '#475569' }}>
              <Trans>Apply your electronic signature.</Trans>
            </Text>
            <Text style={{ margin: '0 0 0 0', fontSize: '14px', color: '#475569' }}>
              <Trans>Receive a signed copy automatically.</Trans>
            </Text>
          </Container>

          <Hr style={{ maxWidth: '560px', margin: '32px auto', borderColor: '#e2e8f0' }} />

          {/* Footer */}
          <Container style={{ maxWidth: '560px', margin: '0 auto 32px', textAlign: 'center' }}>
            <Text style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#94a3b8' }}>
              © 2025 Global Legal Check
            </Text>
            <Text style={{ margin: 0, fontSize: '12px' }}>
              <Link href="#" style={{ color: '#007CFA', textDecoration: 'none' }}>
                <Trans>Privacy Policy</Trans>
              </Link>
              {' | '}
              <Link href="#" style={{ color: '#007CFA', textDecoration: 'none' }}>
                <Trans>Security Information</Trans>
              </Link>
              {' | '}
              <Link href="#" style={{ color: '#007CFA', textDecoration: 'none' }}>
                <Trans>Support</Trans>
              </Link>
            </Text>
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default DocumentInviteEmailTemplate;
