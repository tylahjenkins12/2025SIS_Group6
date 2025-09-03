import { Card, CardBody, Button } from "@/components/ui";

export default function HomePage() {
  return (
    <section className="min-h-screen bg-blue-100 py-12">
      <div className="grid gap-6 md:grid-cols-2 max-w-5xl mx-auto">
        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold">Lecturer</h2>
            <p className="mt-2 text-sm text-gray-600">
              Start a live session and publish questions.
            </p>
            <div className="mt-4">
              <Button as-child>
                {/* @ts-ignore */}
                <a href="/lecturer">I’m a lecturer</a>
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-xl font-semibold">Student</h2>
            <p className="mt-2 text-sm text-gray-600">
              Join with a code and answer MCQs.
            </p>
            <div className="mt-4">
              <Button variant="secondary" as-child>
                {/* @ts-ignore */}
                <a href="/student">I’m a student</a>
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
