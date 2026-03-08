import { Shield } from 'lucide-react';

const privacyContent = `
## 1. Introduction

Chopa Cosmetics Limited ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.

## 2. Information We Collect

### Personal Information
When you create an account, place an order, or contact us, we may collect:
- **Full name** and contact details (phone number, email address)
- **Delivery address** for order fulfillment
- **Payment information** (MPesa transaction codes — we do not store card details)
- **Account credentials** (email and securely hashed passwords)

### Automatically Collected Information
When you browse our website, we may automatically collect:
- **Device information** (browser type, operating system)
- **Usage data** (pages visited, time spent, referral sources)
- **IP address** (anonymized for analytics)
- **Cookies and similar technologies** (see Section 6)

## 3. How We Use Your Information

We use the information we collect to:
- **Process and fulfill orders**, including delivery coordination
- **Manage your account** and provide customer support
- **Send order confirmations** and status updates
- **Improve our website** and product offerings through analytics
- **Communicate promotions** and announcements (with your consent)
- **Prevent fraud** and ensure website security
- **Comply with legal obligations**

## 4. Information Sharing

We do **not** sell, trade, or rent your personal information to third parties. We may share your data with:
- **Delivery personnel** — your name, phone number, and delivery address for order fulfillment
- **Payment processors** — MPesa for transaction processing
- **Analytics providers** — Google Analytics (with anonymized IP) to understand site usage
- **Legal authorities** — when required by law or to protect our rights

## 5. Data Security

We implement appropriate security measures to protect your personal information:
- Passwords are **securely hashed** and never stored in plain text
- All data transmission uses **SSL/TLS encryption**
- Access to personal data is **restricted** to authorized personnel only
- Regular security reviews and updates are conducted

However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.

## 6. Cookies & Tracking

Our website uses cookies and similar technologies:

| Cookie Type | Purpose | Duration |
|---|---|---|
| **Essential** | Site functionality, session management | Session |
| **Analytics** | Google Analytics (G-3GMYZJJS2S) with anonymized IP | 2 years |
| **Preferences** | Theme, language, cookie consent choice | Persistent |

You can manage cookie preferences through the cookie consent banner shown on your first visit. You may also disable cookies in your browser settings, though this may affect site functionality.

## 7. Your Rights

You have the right to:
- **Access** the personal data we hold about you
- **Correct** inaccurate or incomplete information
- **Delete** your account and associated data
- **Withdraw consent** for marketing communications
- **Object** to data processing for analytics purposes

To exercise any of these rights, contact us using the details in Section 11.

## 8. Data Retention

We retain your personal information for as long as:
- Your account remains active
- Necessary to fulfill the purposes outlined in this policy
- Required by applicable law (e.g., transaction records for tax purposes)

Order history is retained for **2 years** after completion. You may request deletion of your account at any time.

## 9. Children's Privacy

Our services are not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete it.

## 10. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. We encourage you to review this policy periodically.

## 11. Contact Us

If you have questions or concerns about this Privacy Policy or our data practices, contact us:

- **Phone:** 0715167179 (James – Manager)
- **Phone:** 0757435912 (Pius – Manager)
- **Email:** Through our website contact form
- **Location:** KAKA HOUSE – OTC, along Racecourse Road, opposite Kaka Travellers Sacco, Nairobi

---

*Last updated: March 2026*
`;

const PrivacyPolicy = () => {
  return (
    <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl">
      <div className="glass-card rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold gradient-text">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">Chopa Cosmetics Limited</p>
          </div>
        </div>

        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
          {privacyContent.split('\n\n').map((block, i) => {
            if (block.startsWith('## ')) {
              return (
                <h2 key={i} className="text-xl md:text-2xl font-display font-semibold text-foreground mt-8 mb-4 border-b border-border pb-2">
                  {block.replace('## ', '')}
                </h2>
              );
            }
            if (block.startsWith('### ')) {
              return (
                <h3 key={i} className="text-lg md:text-xl font-semibold text-foreground mt-6 mb-3">
                  {block.replace('### ', '')}
                </h3>
              );
            }
            if (block.startsWith('| ')) {
              const rows = block.split('\n').filter(r => !r.startsWith('|---'));
              const headers = rows[0]?.split('|').filter(Boolean).map(h => h.trim());
              const dataRows = rows.slice(1);
              return (
                <div key={i} className="overflow-x-auto mb-4">
                  <table className="w-full text-sm border border-border rounded-lg">
                    <thead>
                      <tr className="bg-muted/50">
                        {headers?.map((h, j) => (
                          <th key={j} className="px-3 py-2 text-left text-foreground font-semibold border-b border-border">{h.replace(/\*\*/g, '')}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows.map((row, j) => {
                        const cells = row.split('|').filter(Boolean).map(c => c.trim());
                        return (
                          <tr key={j} className="border-b border-border last:border-0">
                            {cells.map((cell, k) => (
                              <td key={k} className="px-3 py-2 text-muted-foreground">{cell.replace(/\*\*/g, '')}</td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            }
            if (block.startsWith('- ')) {
              const items = block.split('\n').filter(l => l.startsWith('- '));
              return (
                <ul key={i} className="list-disc list-inside space-y-2 mb-4 text-muted-foreground">
                  {items.map((item, j) => (
                    <li key={j} className="text-muted-foreground" dangerouslySetInnerHTML={{
                      __html: item.replace('- ', '').replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
                    }} />
                  ))}
                </ul>
              );
            }
            if (block.startsWith('---')) {
              return <hr key={i} className="border-border my-6" />;
            }
            if (block.startsWith('*')) {
              return (
                <p key={i} className="text-xs text-muted-foreground italic text-center mt-4">
                  {block.replace(/\*/g, '')}
                </p>
              );
            }
            if (block.trim() === '') return null;
            return (
              <p key={i} className="text-muted-foreground leading-relaxed mb-4" dangerouslySetInnerHTML={{
                __html: block.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
