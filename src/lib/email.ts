// Email notification framework
// Currently returns a placeholder. Integrate with SendGrid/Resend/Nodemailer when ready.

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // Placeholder: email notification logged to console in development only
  if (process.env.NODE_ENV === "development") {
    console.error("[Email Notification]", {
      to: options.to,
      subject: options.subject,
      preview: options.html.replace(/<[^>]+>/g, "").slice(0, 100),
    });
  }

  // TODO: Integrate with email service
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'AnimeVoid <noreply@animevoid.com>',
  //   to: options.to,
  //   subject: options.subject,
  //   html: options.html,
  // });

  return true;
}

export function episodeEmailHtml(title: string, episodeNumber: number, episodeTitle: string | null, slug: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 20px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #dc143c; margin: 0;">ANIMEVOID</h1>
      </div>
      <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border: 1px solid #333;">
        <h2 style="color: #ffffff; margin: 0 0 8px 0;">New Episode Available!</h2>
        <p style="color: #999; margin: 0 0 16px 0;">
          <strong style="color: #dc143c;">${title}</strong> has a new episode.
        </p>
        <p style="color: #ccc; font-size: 18px; margin: 0 0 20px 0;">
          Episode ${episodeNumber}${episodeTitle ? ` - ${episodeTitle}` : ""}
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/watch/${slug}/${episodeNumber}"
           style="display: inline-block; background: #dc143c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          Watch Now
        </a>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #666; font-size: 12px;">
        <p>You're receiving this because you have this anime on your watchlist.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/notifications/preferences" style="color: #dc143c;">Manage notification preferences</a></p>
      </div>
    </div>
  `;
}

export function mentionEmailHtml(mentionedBy: string, commentPreview: string, slug: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 20px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #dc143c; margin: 0;">ANIMEVOID</h1>
      </div>
      <div style="background: #1a1a1a; border-radius: 8px; padding: 24px; border: 1px solid #333;">
        <h2 style="color: #ffffff; margin: 0 0 8px 0;">You were mentioned!</h2>
        <p style="color: #999; margin: 0 0 16px 0;">
          <strong style="color: #dc143c;">@${mentionedBy}</strong> mentioned you in a comment.
        </p>
        <p style="color: #ccc; font-style: italic; margin: 0 0 20px 0;">
          "${commentPreview}"
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/anime/${slug}"
           style="display: inline-block; background: #dc143c; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">
          View Comment
        </a>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #666; font-size: 12px;">
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/notifications/preferences" style="color: #dc143c;">Manage notification preferences</a></p>
      </div>
    </div>
  `;
}
