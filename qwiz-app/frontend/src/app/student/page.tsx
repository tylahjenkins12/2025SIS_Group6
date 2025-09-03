"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, Button, Input, Badge } from "@/components/ui";

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
    <div className="mx-auto max-w-md">
      <Card>
        <CardBody>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Join a session</h2>
            <Badge>Step 1</Badge>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-700">Your nickname</label>
              <Input placeholder="e.g. Alex" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-gray-700">Session code</label>
              <Input placeholder="e.g. 39KQ" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
            </div>
            <div className="flex justify-end">
              <Button onClick={join}>Join</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
