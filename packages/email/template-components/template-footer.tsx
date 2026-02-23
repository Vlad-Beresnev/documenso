import { Section, Text } from '../components';
import { useBranding } from '../providers/branding';

export type TemplateFooterProps = {
  isDocument?: boolean;
};

export const TemplateFooter = ({ isDocument = true }: TemplateFooterProps) => {
  const branding = useBranding();

  return (
    <Section className="text-center">
      {/* {isDocument && !branding.brandingHidePoweredBy && (
        <Text className="my-4 text-center text-base text-slate-400">
          <Trans>This document was sent using GlobalLegalCheck.</Trans>
        </Text>
      )} */}

      {branding.brandingEnabled && branding.brandingCompanyDetails && (
        <Text className="my-8 text-center text-sm text-slate-400">
          {branding.brandingCompanyDetails.split('\n').map((line, idx) => {
            return (
              <>
                {idx > 0 && <br />}
                {line}
              </>
            );
          })}
        </Text>
      )}

      {!branding.brandingEnabled && (
        <Text className="my-8 text-center text-sm text-slate-400">GlobalLegalCheck</Text>
      )}
    </Section>
  );
};

export default TemplateFooter;
