export default function HomePage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Welcome 👋</h2>
      <p>This is the starter UI for your lecture quiz MVP.</p>
      <ul className="list-disc pl-6">
        <li>Lecturer can start a session and (later) upload slides.</li>
        <li>Students join with a 6-digit code and answer MCQs.</li>
      </ul>
      <div className="mt-6 flex gap-3">
        <a
          href="/lecturer"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          I’m a lecturer
        </a>
        <a
          href="/student"
          className="rounded-md border px-4 py-2"
        >
          I’m a student
        </a>
      </div>
    </section>
  );
}
