import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || '';
const smtpPass = process.env.SMTP_PASS || '';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: smtpUser,
        pass: smtpPass,
    },
});

interface SendMailParams {
    to: string;
    subject: string;
    html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
    if (!smtpUser || !smtpPass) {
        console.warn('=== SMTP NOT CONFIGURED (SMTP_USER or SMTP_PASS is missing) ===');
        console.log('Would send email to:', to);
        console.log('Subject:', subject);
        console.log('HTML:', html);
        return { success: false, message: 'SMTP not configured' };
    }

    try {
        const info = await transporter.sendMail({
            from: `"SIPPro" <${smtpUser}>`,
            to,
            subject,
            html,
        });
        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
