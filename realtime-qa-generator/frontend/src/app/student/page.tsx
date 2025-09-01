"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StudentJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  function join() {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (c.length < 3 || n.length < 2) return;
    sessionStorage.setItem("mvp_code", c);
    sessionStorage.setItem("mvp_name", n);
    router.push("/student/play");
  }

  return (
    <section className="max-w-sm space-y-4">
      <h2 className="text-2xl font-semibold">Join a session</h2>
      <label className="block text-sm">
        Your nickname
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alex"
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Session code
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. 39KQ"
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      <button onClick={join} className="rounded-md bg-black px-4 py-2 text-white">
        Join
      </button>
    </section>
  );
}
