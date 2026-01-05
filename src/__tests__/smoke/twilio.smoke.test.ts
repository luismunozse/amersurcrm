import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __setTwilioClientFactory,
  enviarSMS,
  enviarSMSMasivo,
  enviarWhatsApp,
  enviarWhatsAppMasivo,
} from '@/lib/services/twilio';

const mockCreateMessage = vi.fn();
const setMockFactory = () =>
  __setTwilioClientFactory(async () => ({
    client: {
      messages: {
        create: mockCreateMessage,
      },
    } as any,
    config: {
      accountSid: 'AC1234567890',
      authToken: 'secret',
      whatsappFrom: 'whatsapp:+18312154070',
      smsFrom: '+17629943984',
    },
  }));

const baseEnv = { ...process.env };

beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = 'AC1234567890';
  process.env.TWILIO_AUTH_TOKEN = 'secret';
  process.env.TWILIO_PHONE_NUMBER = '+17629943984';
  process.env.TWILIO_WHATSAPP_FROM = 'whatsapp:+18312154070';
  mockCreateMessage.mockReset();
  const now = new Date();
  mockCreateMessage.mockResolvedValue({
    sid: 'SM_TEST',
    status: 'sent',
    to: '+51911111111',
    from: '+17629943984',
    body: 'Test',
    dateCreated: now,
    dateSent: now,
  });
  setMockFactory();
});

describe('Twilio service smoke tests', () => {
  afterAll(() => {
    process.env = baseEnv;
    __setTwilioClientFactory(null);
  });

  it('envía mensajes de WhatsApp agregando el prefijo requerido', async () => {
    const now = new Date();
    mockCreateMessage.mockResolvedValue({
      sid: 'SM123',
      status: 'queued',
      to: 'whatsapp:+51987654321',
      from: 'whatsapp:+18312154070',
      body: 'Hola',
      dateCreated: now,
      dateSent: now,
    });

    const result = await enviarWhatsApp('+51987654321', 'Hola mundo');

    expect(mockCreateMessage).toHaveBeenCalledWith({
      from: 'whatsapp:+18312154070',
      to: 'whatsapp:+51987654321',
      body: 'Hola mundo',
    });
    expect(result.sid).toBe('SM123');
  });

  it('envía SMS usando el número configurado', async () => {
    const now = new Date();
    mockCreateMessage.mockResolvedValue({
      sid: 'SM999',
      status: 'sent',
      to: '+51911111111',
      from: '+17629943984',
      body: 'Test',
      dateCreated: now,
      dateSent: now,
    });

    await enviarSMS('+51911111111', 'Test');

    expect(mockCreateMessage).toHaveBeenCalledWith({
      from: '+17629943984',
      to: '+51911111111',
      body: 'Test',
    });
  });

  it('procesa envíos masivos y agrupa errores', async () => {
    const now = new Date();
    mockCreateMessage
      .mockResolvedValueOnce({
        sid: 'SM_OK',
        status: 'sent',
        to: 'whatsapp:+51987654321',
        from: 'whatsapp:+18312154070',
        body: 'Hola',
        dateCreated: now,
        dateSent: now,
      })
      .mockRejectedValueOnce(new Error('queue-full'));

    const resultado = await enviarWhatsAppMasivo(
      ['+51987654321', '+51900000000'],
      'Hola'
    );

    expect(resultado.exitosos).toHaveLength(1);
    expect(resultado.fallidos).toEqual([
      { numero: '+51900000000', error: 'Error al enviar WhatsApp: queue-full' },
    ]);
  });

  it('reporta el fallo cuando faltan credenciales en envíos masivos', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    __setTwilioClientFactory(null);
    const resultado = await enviarSMSMasivo(['+51988888888'], 'Hola');

    expect(resultado.exitosos).toHaveLength(0);
    expect(resultado.fallidos[0]?.error).toMatch(/Credenciales de Twilio/);
    setMockFactory();
  });
});
