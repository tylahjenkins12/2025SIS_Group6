"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
    <section className="max-w-lg space-y-4">
      <h2 className="text-2xl font-semibold">Start a session</h2>
      <p>Share this code with your class:</p>
      <div className="rounded-md border p-4">
        <div className="text-sm text-gray-600">Session code</div>
        <div className="text-4xl font-bold tracking-widest">{code}</div>
      </div>
      <button
        className="rounded-md bg-black px-4 py-2 text-white"
        onClick={() => router.push(`/lecturer/session?code=${code}`)}
      >
        Continue
      </button>
    </section>
  );
}
