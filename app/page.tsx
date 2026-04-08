export default function HomePage() {
  return (
    <section className="panel">
      <h2>Validity without Visibility</h2>
      <p>
        NextMed proves a patient has a valid vaccination attestation signed by
        an authorized provider, without exposing patient identity, clinic
        identity, or event date.
      </p>
      <div className="grid">
        <article>
          <h3>1. /issue</h3>
          <p>
            Provider signs and issues a private attestation to the patient
            wallet.
          </p>
        </article>
        <article>
          <h3>2. /passport</h3>
          <p>
            Patient generates a local ZK proof using Midnight witness context.
          </p>
        </article>
        <article>
          <h3>3. /verify</h3>
          <p>Verifier receives only a boolean eligibility result on-chain.</p>
        </article>
      </div>
    </section>
  );
}
