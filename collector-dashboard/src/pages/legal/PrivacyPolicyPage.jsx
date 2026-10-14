import { useEffect } from 'react'
import { Link } from 'react-router'
import { GovtMark } from '../../components/domain/BrandMark'

/**
 * Public privacy policy (no login needed) — the link given to Google Play
 * for the Anbaram mobile app. Address: /privacy-policy
 * To update: edit the text below and change LAST_UPDATED.
 */
const LAST_UPDATED = '14 October 2026'
const CONTACT_EMAIL = '[insert official contact email]'
const CONTACT_ADDRESS = '[insert Collectorate office address]'

function Section({ number, title, children }) {
  return (
    <section className="mt-10">
      <h2 className="border-l-4 border-brand-700 pl-3 text-lg font-bold text-brand-800">
        {number}. {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  )
}

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-2 pl-6">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

const COLLECTED = [
  [
    'Account information',
    'Full name, organization name, phone number, email address, password (stored in encrypted/hashed form)',
    'To create and verify your Nodal Officer account, and for District Administration approval',
  ],
  [
    'Role & assignment',
    'Your officer role (Collection Point or Distribution Center) and your assigned location',
    "To route you to the correct screens and restrict access to your own location's data",
  ],
  [
    'Donation records',
    'Photographs of donated item piles (clothes, blankets, stationery, books), category weights, and condition notes you enter',
    'To maintain an accurate, verifiable record of each collection and delivery',
  ],
  [
    'Shipment & logistics details',
    'Dispatch and receipt timestamps, vehicle number, and delivery personnel name you enter when dispatching a batch',
    'To track items from collection through to delivery',
  ],
  [
    'Usage data',
    'Login activity and basic in-app actions (e.g. when a collection or shipment was logged)',
    'For administrative oversight and to support features like collection-due reminders',
  ],
]

const ExternalLink = ({ href, children }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
    {children}
  </a>
)

export function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy — Anbaram'
  }, [])

  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-3xl px-5 pt-10 pb-20 text-[15.5px] leading-relaxed text-ink">
        <header className="border-b-[3px] border-brand-700 pb-5">
          <GovtMark />
          <p className="mt-6 text-xs tracking-[0.06em] text-muted uppercase">Chengalpattu District Administration</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-brand-800">Anbaram — Privacy Policy</h1>
          <p className="mt-1 text-sm text-muted">Last updated: {LAST_UPDATED}</p>
        </header>

        <p className="mt-8">
          Anbaram (&quot;the App&quot;, &quot;we&quot;, &quot;us&quot;) is a donation-drive management system operated
          by the Chengalpattu District Administration, Tamil Nadu. This policy explains what information the App
          collects, how it is used, and how it is protected. Anbaram is used exclusively by appointed Nodal Officers
          (Collection Point and Distribution Center) and District Administration staff — it is not a public or
          consumer-facing application, and it does not collect information from members of the public who make donations
          in person.
        </p>

        <Section number={1} title="Who This Policy Covers">
          <p>
            This policy applies to individuals who use the Anbaram mobile application or administrative dashboard as a
            registered, approved Nodal Officer or District Administration staff member. It does not apply to members of
            the public donating items at a Collection Point, as the App does not collect any information from them
            directly.
          </p>
        </Section>

        <Section number={2} title="Information We Collect">
          <p>We collect only what is necessary to operate an accountable, government-run donation logistics system:</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[14.5px]">
              <thead>
                <tr className="bg-brand-50 text-left text-brand-800">
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 font-semibold">What We Collect</th>
                  <th className="px-3 py-2.5 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {COLLECTED.map(([category, what, why]) => (
                  <tr key={category} className="border-b border-line align-top">
                    <td className="px-3 py-2.5 font-medium">{category}</td>
                    <td className="px-3 py-2.5">{what}</td>
                    <td className="px-3 py-2.5">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-lg bg-brand-50 px-5 py-4">
            <strong>What we do not collect:</strong> We do not collect precise device location/GPS, do not use
            advertising identifiers, do not serve ads, and do not collect any information from the general public or
            donors.
          </div>
        </Section>

        <Section number={3} title="How We Use Your Information">
          <Bullets
            items={[
              'To operate the core functions of the App — logging donations, dispatching and verifying shipments, and managing officer accounts',
              'To let District Administration staff review collection activity, resolve flagged issues, and generate reports (e.g. monthly/quarterly donation totals)',
              'To contact you regarding your account, such as approval status or operational updates',
              "To maintain a public transparency summary of district-wide donation totals — this summary contains only aggregate figures and never any individual's personal information",
            ]}
          />
        </Section>

        <Section number={4} title="Where Your Information Is Stored">
          <p>Anbaram uses the following third-party infrastructure providers to operate:</p>
          <Bullets
            items={[
              <>
                <strong>Supabase</strong> — stores account information, donation records, and shipment data in a secured
                database. See{' '}
                <ExternalLink href="https://supabase.com/privacy">Supabase&apos;s Privacy Policy</ExternalLink>.
              </>,
              <>
                <strong>Cloudinary</strong> — stores photographs taken during donation logging and verification. See{' '}
                <ExternalLink href="https://cloudinary.com/privacy">Cloudinary&apos;s Privacy Policy</ExternalLink>.
              </>,
            ]}
          />
          <p>
            These providers act as data processors on our behalf and do not use your information for their own purposes.
          </p>
        </Section>

        <Section number={5} title="Who Can Access Your Information">
          <Bullets
            items={[
              'You can always access your own account information within the App.',
              "Collection Point and Distribution Center officers can only see data relevant to their own assigned location — not other officers' or other locations' records.",
              "District Administration (Collector's Office) staff with dashboard access can view officer accounts, donation records, and shipment data across the district, for administrative oversight.",
              'We do not sell, rent, or share your personal information with any third party for marketing purposes.',
            ]}
          />
        </Section>

        <Section number={6} title="Data Retention">
          <p>
            We retain account and donation records for as long as needed to support the district&apos;s administrative
            record-keeping and reporting requirements. If your officer account is no longer active, your account can be
            deactivated on request; donation and shipment records tied to your past activity may be retained as part of
            the district&apos;s official records.
          </p>
        </Section>

        <Section number={7} title="Your Rights">
          <p>You may contact the District Administration (details below) to:</p>
          <Bullets
            items={[
              'Request a copy of the personal information associated with your account',
              'Request correction of inaccurate account information',
              'Request deactivation of your account',
            ]}
          />
        </Section>

        <Section number={8} title="Children's Privacy">
          <p>
            Anbaram is intended solely for use by appointed adult Nodal Officers and District Administration staff. It
            is not directed at, and should not be used by, children.
          </p>
        </Section>

        <Section number={9} title="Security">
          <p>
            We use industry-standard measures to protect your information, including encrypted password storage and
            access controls that restrict officers to their own assigned location&apos;s data. No method of electronic
            storage is 100% secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section number={10} title="Changes to This Policy">
          <p>
            We may update this policy from time to time to reflect changes in the App or applicable requirements. The
            &quot;Last updated&quot; date at the top of this page will reflect the most recent revision.
          </p>
        </Section>

        <Section number={11} title="Contact Us">
          <p>For questions about this policy or your data, contact:</p>
          <div className="rounded-lg bg-brand-50 px-5 py-4">
            Chengalpattu District Administration
            <br />
            Anbaram Donation Drive Initiative
            <br />
            Email: <em>{CONTACT_EMAIL}</em>
            <br />
            Address: <em>{CONTACT_ADDRESS}</em>
          </div>
        </Section>

        <footer className="mt-12 border-t border-line pt-5 text-sm text-muted">
          Anbaram — An initiative of the Chengalpattu District Administration, Government of Tamil Nadu.
          <span className="mx-2" aria-hidden>
            ·
          </span>
          <Link to="/login" className="text-brand-700 underline">
            Collector Office sign in
          </Link>
        </footer>
      </div>
    </div>
  )
}
