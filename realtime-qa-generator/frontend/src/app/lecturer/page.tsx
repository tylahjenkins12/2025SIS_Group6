"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, Button, Badge } from "@/components/ui";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 4; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export default function LecturerStartPage() {
  const router = useRouter();
  const [code] = useState(makeCode());

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Start a session</h2>
            <Badge>Step 1</Badge>
          </div>

          <p className="mt-2 text-sm text-gray-600">Share this code with your class:</p>

          <div className="mt-4 rounded-2xl border bg-white p-6 text-center shadow-sm">
            <div className="text-xs uppercase tracking-wide text-gray-500">Session code</div>
            <div className="mt-1 text-5xl font-extrabold tracking-widest">{code}</div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={() => router.push(`/lecturer/session?code=${code}`)}>Continue</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
