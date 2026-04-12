import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const EMAIL_TEMPLATES = {
  order_received: {
    subject: 'Ihre Bestellung ist bei uns eingegangen',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihre Bestellung.

Wir haben Ihre Anfrage erhalten und werden diese schnellstmoeglich bearbeiten. Sobald Ihre Bestellung bestaetigt wurde, erhalten Sie eine weitere Benachrichtigung per E-Mail.

Die Bestellnummer lautet: ${data.orderNumber}

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_confirmed: {
    subject: 'Ihre Bestellung wurde bestaetigt',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihre Bestellung.

Ihre Bestellung wurde bestaetigt. Bitte holen Sie Ihre Bestellung in etwa ${data.timeValue || 15} Minuten ab.

Bestellnummer: ${data.orderNumber}

Wir freuen uns auf Ihren Besuch.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_time: {
    subject: 'Ihre Bestellung wurde bestaetigt',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihre Bestellung.

Ihre Bestellung wurde bestaetigt. Bitte holen Sie Ihre Bestellung in etwa ${data.timeValue} Minuten ab.

Bestellnummer: ${data.orderNumber}
Abholzeit: ca. ${data.timeValue} Minuten

Wir freuen uns auf Ihren Besuch.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_preparing: {
    subject: 'Ihre Bestellung wird zubereitet',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

ihre Bestellung wird derzeit frisch fuer Sie zubereitet.

Bestellnummer: ${data.orderNumber}

Bitte haben Sie noch etwas Geduld. Ihre Bestellung ist in Kuerze abholbereit.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_ready: {
    subject: 'Ihre Bestellung ist abholbereit',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

wir freuen uns Ihnen mitzuteilen, dass Ihre Bestellung jetzt abholbereit ist.

Bestellnummer: ${data.orderNumber}

Sie koennen Ihre Bestellung jetzt abholen.

Wir wuenschen Ihnen einen guten Appetit.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_completed: {
    subject: 'Ihre Bestellung ist abgeschlossen',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihren Besuch.

Ihre Bestellung ist abgeschlossen. Wir hoffen, Sie hatten einen angenehmen Aufenthalt.

Bestellnummer: ${data.orderNumber}

Wir freuen uns, Sie bald wieder bei uns begruessen zu duerfen.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_cancelled: {
    subject: 'Ihre Bestellung wurde storniert',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

hiermit bestaetigen wir Ihnen, dass Ihre Bestellung storniert wurde.

Bestellnummer: ${data.orderNumber}

Falls Sie weitere Fragen haben, kontaktieren Sie uns bitte telefonisch.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  order_rejected: {
    subject: 'Ihre Bestellung konnte leider nicht bestaetigt werden',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

leider muessen wir Ihnen mitteilen, dass wir Ihre Bestellung derzeit nicht wie gewuenscht bearbeiten koennen.

Bestellnummer: ${data.orderNumber}

Dies kann verschiedene Gruende haben. Bitte kontaktieren Sie uns gegebenenfalls telefonisch, um Ihre Bestellung zu klaeren.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  reservation_received: {
    subject: 'Ihre Reservierungsanfrage ist bei uns eingegangen',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihre Reservierungsanfrage.

Wir haben Ihre Anfrage erhalten und pruefen diese schnellstmoeglich. Sobald Ihre Reservierung bestaetigt wurde, erhalten Sie eine weitere Benachrichtigung per E-Mail.

Ihre Reservierungsnummer lautet: ${data.reservationNumber}

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  reservation_confirmed: {
    subject: 'Ihre Reservierung wurde bestaetigt',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

wir freuen uns, Ihnen mitteilen zu koennen, dass Ihre Reservierung erfolgreich bestaetigt wurde.

Reservierungsnummer: ${data.reservationNumber}
Datum: ${data.reservationDate}
Uhrzeit: ${data.reservationTime}
Personenzahl: ${data.partySize || 1} Person(en)

Wir freuen uns darauf, Sie bei uns begruessen zu duerfen.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  reservation_later: {
    subject: 'Bitte kommen Sie spaeter',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

vielen Dank fuer Ihre Reservierungsanfrage.

Leider ist es uns zum gewuenschten Zeitpunkt nicht moeglich, Sie zu bedienen. Koennten Sie bitte spaeter kommen?

Reservierungsnummer: ${data.reservationNumber}
Urspruengliche Zeit: ${data.reservationTime}

Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  reservation_rejected: {
    subject: 'Ihre Reservierung konnte leider nicht bestaetigt werden',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

leider muessen wir Ihnen mitteilen, dass wir Ihre Reservierungsanfrage zum gewuenschten Zeitpunkt nicht bestaetigen koennen.

Reservierungsnummer: ${data.reservationNumber}

Wir wuerden uns freuen, Sie zu einem anderen Zeitpunkt bei uns begruessen zu duerfen. Bitte kontaktieren Sie uns fuer eine alternative Terminvereinbarung.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  },

  reservation_cancelled: {
    subject: 'Ihre Reservierung wurde storniert',
    template: (data) => `
Sehr geehrte/r ${data.customerName},

hiermit bestaetigen wir Ihnen, dass Ihre Reservierung storniert wurde.

Reservierungsnummer: ${data.reservationNumber}

Falls Sie weitere Fragen haben, kontaktieren Sie uns bitte.

Mit freundlichen Gruessen
Sakura Restaurant
    `.trim()
  }
};

export class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD ||
        process.env.SMTP_USER === 'your-email@gmail.com') {
      console.log('SMTP nicht konfiguriert, E-Mail-Versand deaktiviert');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
      console.log('SMTP Transporter initialisiert');
    } catch (error) {
      console.error('Fehler bei SMTP Initialisierung:', error);
    }
  }

  async sendEmail(options) {
    const {
      type,
      customerEmail,
      customerName,
      timeValue,
      orderNumber,
      reservationNumber,
      reservationTime,
      reservationDate,
      partySize
    } = options;

    if (!this.transporter) {
      console.log('E-Mail-Transport nicht verfuegbar, E-Mail wird uebersprungen');
      return { success: false, reason: 'Transport not configured' };
    }

    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      console.error('Unbekannter E-Mail-Typ:', type);
      return { success: false, reason: 'Unknown template' };
    }

    const data = {
      customerName,
      timeValue,
      orderNumber,
      reservationNumber,
      reservationTime,
      reservationDate,
      partySize
    };

    const subject = template.subject;
    const text = template.template(data);

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'Sakura Restaurant <noreply@sakura-restaurant.de>',
        to: customerEmail,
        subject: subject,
        text: text
      });

      console.log('E-Mail gesendet:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Fehler beim Senden der E-Mail:', error.message);
      return { success: false, error: error.message };
    }
  }
}
