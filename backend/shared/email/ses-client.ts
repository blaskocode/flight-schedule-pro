import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export interface EmailParams {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

export async function sendEmail(params: EmailParams): Promise<void> {
  const command = new SendEmailCommand({
    Source: process.env.FROM_EMAIL || 'noreply@flightschedulepro.com',
    Destination: {
      ToAddresses: params.to,
    },
    Message: {
      Subject: {
        Data: params.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: params.htmlBody,
          Charset: 'UTF-8',
        },
        Text: {
          Data: params.textBody,
          Charset: 'UTF-8',
        },
      },
    },
  });

  await sesClient.send(command);
}

