import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import type { RecipientRole } from '@prisma/client';
import { OrganisationType } from '@prisma/client';

import { RECIPIENT_ROLES_DESCRIPTION } from '@documenso/lib/constants/recipient-roles';

import { Body, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '../components';
import { useBranding } from '../providers/branding';
import { TemplateCustomMessageBody } from '../template-components/template-custom-message-body';
import type { TemplateDocumentInviteProps } from '../template-components/template-document-invite';
import { TemplateDocumentInvite } from '../template-components/template-document-invite';
import { TemplateFooter } from '../template-components/template-footer';

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

  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

  return (
    <Html>
      <Head />
      <Preview>{_(previewText)}</Preview>

      <Body className="mx-auto my-auto bg-white font-sans">
        <Section>
          <Container className="mx-auto mb-2 mt-8 max-w-xl rounded-lg border border-solid border-slate-200 p-4 backdrop-blur-sm">
            <Section>
              {branding.brandingEnabled && branding.brandingLogo ? (
                <Img src={branding.brandingLogo} alt="Branding Logo" className="mb-4 h-16" />
              ) : (
                <Img
                  src={getAssetUrl('/static/logo.png')}
                  alt="GlobalLegalCheck"
                  className="mb-4 h-6"
                />
              )}

              <TemplateDocumentInvite
                inviterName={inviterName}
                inviterEmail={inviterEmail}
                documentName={documentName}
                signDocumentLink={signDocumentLink}
                assetBaseUrl={assetBaseUrl}
                role={role}
                selfSigner={selfSigner}
                organisationType={organisationType}
                teamName={teamName}
                includeSenderDetails={includeSenderDetails}
              />
            </Section>
          </Container>

          <Container className="mx-auto mt-8 max-w-xl">
            <Section>
              {customBody ? (
                <Text className="mt-2 text-base text-slate-400">
                  <TemplateCustomMessageBody text={customBody} />
                </Text>
              ) : (
                <>
                  <Text className="m-0 text-sm text-slate-600">
                    <Trans>
                      <strong>Sent by:</strong> {inviterName}
                    </Trans>
                  </Text>

                  {organisationType === OrganisationType.ORGANISATION && teamName && (
                    <Text className="m-0 text-sm text-slate-600">
                      <Trans>
                        <strong>Organization:</strong> {teamName}
                      </Trans>
                    </Text>
                  )}

                  <Text className="m-0 text-sm text-slate-600">
                    <Trans>
                      <strong>Email:</strong>{' '}
                      <Link className="text-slate-600" href={`mailto:${inviterEmail}`}>
                        {inviterEmail}
                      </Link>
                    </Trans>
                  </Text>

                  {expiresAt && (
                    <Text className="mb-0 mt-4 text-sm font-medium text-slate-600">
                      <Trans>
                        This signing request expires on{' '}
                        {new Intl.DateTimeFormat('en-GB', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }).format(expiresAt)}
                        .
                      </Trans>
                    </Text>
                  )}

                  <Text className="mb-0 mt-4 text-sm text-slate-400">
                    <Trans>
                      If you were not expecting this document, please contact the sender before
                      proceeding.
                    </Trans>
                  </Text>
                </>
              )}
            </Section>
          </Container>

          <Hr className="mx-auto mt-12 max-w-xl" />

          <Container className="mx-auto max-w-xl text-center">
            <TemplateFooter />
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default DocumentInviteEmailTemplate;
